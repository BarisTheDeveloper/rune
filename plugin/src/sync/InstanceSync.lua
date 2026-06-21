--[[
	Rune Studio Plugin - Instance Sync with Undo Support
	Handles bidirectional synchronization + change history for rollback
]]

local HttpService = game:GetService("HttpService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")

local InstanceSync = {}
InstanceSync.__index = InstanceSync

local MAX_UNDO = 20

local SERVICE_MAP = {
	Workspace = game.Workspace,
	Players = game.Players,
	Lighting = game.Lighting,
	MaterialService = game.MaterialService,
	ReplicatedFirst = game.ReplicatedFirst,
	ReplicatedStorage = game.ReplicatedStorage,
	ServerScriptService = game.ServerScriptService,
	ServerStorage = game.ServerStorage,
	StarterGui = game.StarterGui,
	StarterPack = game.StarterPack,
	StarterPlayer = game.StarterPlayer,
	SoundService = game.SoundService,
	Teams = game.Teams,
	TextChatService = game.TextChatService,
	Chat = game.Chat,
	LocalizationService = game.LocalizationService,
}

function InstanceSync.new(webSocketClient, mainWindow)
	local self = setmetatable({}, InstanceSync)

	self.WebSocket = webSocketClient
	self.MainWindow = mainWindow
	self.Enabled = true
	self.InstanceMap = {}
	self.PendingChanges = {}
	self.UndoStack = {}
	self.InstanceCount = 0

	self:SetupStudioListeners()

	return self
end

function InstanceSync:SetEnabled(enabled)
	self.Enabled = enabled
end

function InstanceSync:RequestSync()
	if not self.Enabled then return end
	self.MainWindow:LogActivity("info", "Requesting full sync...")
	self.WebSocket:Send({
		type = "request_sync",
		timestamp = os.time(),
	})
end

function InstanceSync:HandleMessage(message)
	if not self.Enabled then return end

	local msgType = message.type

	if msgType == "full_sync" then
		self:HandleFullSync(message.data)
	elseif msgType == "instance_created" then
		self:HandleInstanceCreated(message.data)
	elseif msgType == "instance_updated" then
		self:HandleInstanceUpdated(message.data)
	elseif msgType == "instance_deleted" then
		self:HandleInstanceDeleted(message.data)
	elseif msgType == "instance_moved" then
		self:HandleInstanceMoved(message.data)
	elseif msgType == "instance_renamed" then
		self:HandleInstanceRenamed(message.data)
	elseif msgType == "property_changed" then
		self:HandlePropertyChanged(message.data)
	elseif msgType == "script_source" then
		self:HandleScriptSource(message.data)
	elseif msgType == "sync_complete" then
		local count = message.data and message.data.count or 0
		self.MainWindow:SetStatus("Sync complete", nil)
		self.MainWindow:SetInstanceCount(count)
		self.MainWindow:LogActivity("success", "Sync complete — " .. count .. " instances")
	elseif msgType == "error" then
		warn("[Rune] Server error: " .. tostring(message.error))
		self.MainWindow:LogActivity("error", "Server: " .. tostring(message.error))
	end
end

function InstanceSync:HandleFullSync(data)
	self.MainWindow:LogActivity("sync", "Receiving full sync...")
	self.MainWindow:SetStatus("Syncing...", nil)

	self.InstanceMap = {}

	if data.instances then
		-- Sort: root instances (parentId=nil) first, then children
		table.sort(data.instances, function(a, b)
			local aIsRoot = (a.parentId == nil)
			local bIsRoot = (b.parentId == nil)
			if aIsRoot and not bIsRoot then return true end
			if not aIsRoot and bIsRoot then return false end
			return false
		end)

		for _, instanceData in ipairs(data.instances) do
			self:CreateOrUpdateInstance(instanceData, true)
		end
	end

	-- Build nested tree for UI from flat list
	local treeData = self:BuildTreeFromFlatList(data.instances or {}, data.rootIds or {})
	self.MainWindow:LogActivity("info", "[DEBUG] Tree built, " .. #treeData .. " roots, updating UI...")
	self.MainWindow:UpdateFileTree(treeData)

	local count = data.count or #data.instances
	self.InstanceCount = count
	self.MainWindow:SetInstanceCount(count)
	self.MainWindow:SetStatus("Sync complete — " .. count .. " instances", nil)
	self.MainWindow:LogActivity("success", "Full sync: " .. count .. " instances loaded")
end

-- Build nested tree structure from flat instance list
function InstanceSync:BuildTreeFromFlatList(instances, rootIds)
	-- Build lookup by id
	local lookup = {}
	for _, inst in ipairs(instances) do
		lookup[inst.id] = inst
	end

	-- Attach children as full objects
	local roots = {}
	for _, inst in ipairs(instances) do
		if inst.children and #inst.children > 0 then
			local fullChildren = {}
			for _, childId in ipairs(inst.children) do
				if lookup[childId] then
					table.insert(fullChildren, lookup[childId])
				end
			end
			inst.children = fullChildren
		else
			inst.children = {}
		end

		if inst.parentId == nil then
			table.insert(roots, inst)
		end
	end

	return roots
end

function InstanceSync:HandleInstanceCreated(data)
	local instance = self:CreateOrUpdateInstance(data)
	if instance then
		self.MainWindow:AddFileNode(data.parentId, data)
		self.InstanceCount = self.InstanceCount + 1
		self.MainWindow:SetInstanceCount(self.InstanceCount)
		self.MainWindow:LogActivity("success", "Created: " .. (data.name or "?") .. " (" .. (data.className or "?") .. ")")
	end
end

function InstanceSync:HandleInstanceUpdated(data)
	-- Save undo state before modifying
	self:PushUndo(data.id or data.name, data)

	local instance = self:CreateOrUpdateInstance(data)
	if instance then
		self.MainWindow:LogActivity("info", "Updated: " .. (data.name or "?"))
		self.MainWindow:EnableUndo(true)
	end
end

function InstanceSync:HandleInstanceDeleted(data)
	local id = data.id
	local instance = self.InstanceMap[id]

	if not instance then
		self.MainWindow:LogActivity("warn", "Delete unknown: " .. tostring(id))
		return
	end

	-- Remove from map BEFORE destroying to prevent feedback loop
	self.InstanceMap[id] = nil
	self.MainWindow:RemoveFileNode(id)
	self.InstanceCount = math.max(0, self.InstanceCount - 1)
	self.MainWindow:SetInstanceCount(self.InstanceCount)

	if instance.Parent then
		self:PushUndo(id, { id = id, name = instance.Name, className = instance.ClassName })
		instance:Destroy()
	end

	self.MainWindow:LogActivity("warn", "Deleted: " .. (data.name or id))
	self.MainWindow:EnableUndo(true)
end

function InstanceSync:HandleInstanceMoved(data)
	local instance = self.InstanceMap[data.id]
	if not instance then return end

	local oldParent = instance.Parent
	local newParent = self:FindParent(data.newParentId)

	if newParent then
		self:PushUndo(data.id, { id = data.id, name = instance.Name, oldParentId = oldParent and oldParent.Name })
		instance.Parent = newParent
		self.MainWindow:LogActivity("info", "Moved: " .. instance.Name)
		self.MainWindow:EnableUndo(true)
	end
end

function InstanceSync:HandleInstanceRenamed(data)
	local instance = self.InstanceMap[data.id]
	if instance then
		local oldName = instance.Name
		self:PushUndo(data.id, { id = data.id, oldName = oldName })
		instance.Name = data.newName
		self.MainWindow:LogActivity("info", "Renamed: " .. oldName .. " → " .. data.newName)
		self.MainWindow:EnableUndo(true)
	end
end

function InstanceSync:HandlePropertyChanged(data)
	local instance = self.InstanceMap[data.instanceId or data.id]
	if not instance then return end

	local propName = data.property
	local propValue = data.value

	-- Save old value for undo
	local oldValue = nil
	pcall(function() oldValue = instance[propName] end)
	self:PushUndo(data.instanceId or data.id, {
		id = data.instanceId or data.id,
		property = propName,
		oldValue = oldValue,
		newValue = propValue,
	})

	pcall(function()
		instance[propName] = propValue
	end)
	self.MainWindow:LogActivity("info", "Property: " .. (instance.Name or "?") .. "." .. propName)
	self.MainWindow:EnableUndo(true)
end

function InstanceSync:HandleScriptSource(data)
	local instance = self.InstanceMap[data.id]
	if not instance then return end

	if instance:IsA("LuaSourceContainer") then
		local oldSource = instance.Source
		self:PushUndo(data.id, {
			id = data.id,
			oldSource = oldSource,
			newSource = data.source,
		})
		instance.Source = data.source
		self.MainWindow:LogActivity("info", "Script updated: " .. instance.Name)
		self.MainWindow:EnableUndo(true)
	end
end
function InstanceSync:CreateOrUpdateInstance(data, isInitialSync)
	if not self.Enabled then return nil end

	-- Check if already in our map
	local existing = self.InstanceMap[data.id]
	if existing then
		self:UpdateInstance(existing, data)
		return existing
	end

	local parent = self:FindParent(data.parentId)
	if not parent then
		parent = SERVICE_MAP[data.parentName]
	end

	-- For root instances: if name is a Roblox service, use it directly (skip creating folder)
	if not parent and data.parentId == nil then
		parent = SERVICE_MAP[data.name]
		if parent then
			self.InstanceMap[data.id] = parent
			return parent
		end
	end

	if not parent then
		if not isInitialSync then
			warn("[Rune] Parent not found for: " .. tostring(data.name))
		end
		return nil
	end

	-- Check if an instance with this name already exists under the parent
	local existingChild = parent:FindFirstChild(data.name)
	if existingChild then
		-- Update existing instead of creating duplicate
		self.InstanceMap[data.id] = existingChild
		if data.source and existingChild:IsA("LuaSourceContainer") then
			existingChild.Source = data.source
		end
		self:UpdateInstance(existingChild, data)
		self:HookScriptListener(existingChild)
		return existingChild
	end

	-- Create new instance
	local className = data.className or "Folder"
	local instance = nil

	local success = pcall(function()
		if className == "Script" or className == "LocalScript" or className == "ModuleScript" then
			instance = Instance.new(className)
		elseif className == "Folder" then
			instance = Instance.new("Folder")
		elseif className == "Model" then instance = Instance.new("Model")
		elseif className == "Part" then instance = Instance.new("Part")
		elseif className == "MeshPart" then instance = Instance.new("MeshPart")
		elseif className == "ScreenGui" then instance = Instance.new("ScreenGui")
		elseif className == "Frame" then instance = Instance.new("Frame")
		elseif className == "TextLabel" then instance = Instance.new("TextLabel")
		elseif className == "TextButton" then instance = Instance.new("TextButton")
		elseif className == "ImageLabel" then instance = Instance.new("ImageLabel")
		elseif className == "Sound" then instance = Instance.new("Sound")
		elseif className == "Animation" then instance = Instance.new("Animation")
		elseif className == "IntValue" then instance = Instance.new("IntValue")
		elseif className == "StringValue" then instance = Instance.new("StringValue")
		elseif className == "BoolValue" then instance = Instance.new("BoolValue")
		elseif className == "NumberValue" then instance = Instance.new("NumberValue")
		elseif className == "Color3Value" then instance = Instance.new("Color3Value")
		elseif className == "Vector3Value" then instance = Instance.new("Vector3Value")
		else instance = Instance.new("Folder")
		end
	end)

	if not success or not instance then
		warn("[Rune] Failed to create: " .. tostring(className))
		return nil
	end

	instance.Name = data.name or "NewInstance"

	if data.properties then
		for propName, propData in pairs(data.properties) do
			pcall(function()
				if typeof(propData) == "table" and propData.value ~= nil then
					instance[propName] = propData.value
				else
					instance[propName] = propData
				end
			end)
		end
	end

	if data.source and instance:IsA("LuaSourceContainer") then
		instance.Source = data.source
	end

	if data.attributes then
		for attrName, attrValue in pairs(data.attributes) do
			pcall(function() instance:SetAttribute(attrName, attrValue) end)
		end
	end

	if data.tags then
		for _, tag in ipairs(data.tags) do
			pcall(function() instance:AddTag(tag) end)
		end
	end

	instance.Parent = parent
	self.InstanceMap[data.id] = instance
	self:HookScriptListener(instance)

	return instance
end

function InstanceSync:UpdateInstance(instance, data)
	if data.name and instance.Name ~= data.name then
		instance.Name = data.name
	end

	if data.properties then
		for propName, propData in pairs(data.properties) do
			pcall(function()
				if typeof(propData) == "table" and propData.value ~= nil then
					instance[propName] = propData.value
				else
					instance[propName] = propData
				end
			end)
		end
	end

	if data.source and instance:IsA("LuaSourceContainer") then
		instance.Source = data.source
	end

	if data.attributes then
		for attrName, attrValue in pairs(data.attributes) do
			pcall(function() instance:SetAttribute(attrName, attrValue) end)
		end
	end
end

function InstanceSync:FindParent(parentId)
	if not parentId then return game end
	return self.InstanceMap[parentId] or SERVICE_MAP[parentId]
end

-- ===== UNDO SYSTEM =====

function InstanceSync:PushUndo(id, snapshot)
	table.insert(self.UndoStack, {
		id = id,
		snapshot = snapshot,
		timestamp = os.time(),
	})

	while #self.UndoStack > MAX_UNDO do
		table.remove(self.UndoStack, 1)
	end
end

function InstanceSync:UndoLastChange()
	if #self.UndoStack == 0 then
		self.MainWindow:LogActivity("warn", "Nothing to undo")
		return false
	end

	local entry = table.remove(self.UndoStack)
	local snap = entry.snapshot

	self.MainWindow:LogActivity("sync", "Undoing: " .. (snap.name or snap.id or "?"))

	-- Try to restore
	local instance = self.InstanceMap[snap.id]
	if not instance then
		self.MainWindow:LogActivity("error", "Cannot undo: instance gone")
		return false
	end

	-- Restore name
	if snap.oldName then
		instance.Name = snap.oldName
		self.MainWindow:LogActivity("info", "Name restored: " .. snap.oldName)
	end

	-- Restore source
	if snap.oldSource then
		if instance:IsA("LuaSourceContainer") then
			instance.Source = snap.oldSource
			self.MainWindow:LogActivity("info", "Script source restored")
		end
	end

	-- Restore property
	if snap.oldValue ~= nil and snap.property then
		pcall(function()
			instance[snap.property] = snap.oldValue
		end)
		self.MainWindow:LogActivity("info", "Property restored: " .. snap.property)
	end

	-- Restore parent
	if snap.oldParentId then
		local oldParent = self:FindParent(snap.oldParentId)
		if oldParent then
			instance.Parent = oldParent
			self.MainWindow:LogActivity("info", "Parent restored")
		end
	end

	if #self.UndoStack == 0 then
		self.MainWindow:EnableUndo(false)
	end

	return true
end

-- ===== STUDIO LISTENERS =====

function InstanceSync:HookScriptListener(instance)
	if instance:IsA("LuaSourceContainer") then
		instance:GetPropertyChangedSignal("Source"):Connect(function()
			if not self.Enabled then return end
			self:NotifyScriptSourceChanged(instance)
		end)
	end
end

-- Check if instance is a GUI element that should NOT be synced
local function isGuiElement(instance)
	if instance:IsA("GuiObject") or instance:IsA("GuiBase2d") or instance:IsA("PluginGui") then
		return true
	end
	local current = instance
	while current do
		if current:IsA("PluginGui") or current:IsA("PlayerGui")
			or current:IsA("CoreGui") or current:IsA("StarterGui")
			or current:IsA("PluginGui") then
			return true
		end
		current = current.Parent
	end
	return false
end

function InstanceSync:SetupStudioListeners()
	game.DescendantAdded:Connect(function(instance)
		if not self.Enabled then return end
		if isGuiElement(instance) then return end
		if self:IsSyncedInstance(instance) then return end
		self:NotifyInstanceCreated(instance)

		-- Listen for source changes on scripts
		if instance:IsA("LuaSourceContainer") then
			instance:GetPropertyChangedSignal("Source"):Connect(function()
				if not self.Enabled then return end
				self:NotifyScriptSourceChanged(instance)
			end)
		end
	end)

	game.DescendantRemoving:Connect(function(instance)
		if not self.Enabled then return end
		if isGuiElement(instance) then return end
		if not self:IsSyncedInstance(instance) then return end
		self:NotifyInstanceDeleted(instance)
	end)
end

function InstanceSync:IsSyncedInstance(instance)
	for _, synced in pairs(self.InstanceMap) do
		if synced == instance then return true end
	end
	return false
end

function InstanceSync:NotifyInstanceCreated(instance)
	task.delay(0.5, function()
		if not instance or not instance.Parent then return end
		local data = self:SerializeInstance(instance)
		if data then
			self.WebSocket:Send({
				type = "studio_instance_created",
				data = data,
			})
		end
	end)
end

function InstanceSync:NotifyInstanceDeleted(instance)
	for id, synced in pairs(self.InstanceMap) do
		if synced == instance then
			self.InstanceMap[id] = nil
			self.WebSocket:Send({
				type = "studio_instance_deleted",
				data = { id = id, name = instance.Name },
			})
			break
		end
	end
end

function InstanceSync:NotifyScriptSourceChanged(instance)
	for id, synced in pairs(self.InstanceMap) do
		if synced == instance then
			self.WebSocket:Send({
				type = "studio_script_updated",
				data = { id = id, name = instance.Name, source = instance.Source },
			})
			self.MainWindow:LogActivity("info", "Studio edit: " .. instance.Name)
			break
		end
	end
end

function InstanceSync:SerializeInstance(instance)
	local className = instance.ClassName
	local supported = {
		Folder = true, Script = true, LocalScript = true, ModuleScript = true,
		Model = true, Part = true, MeshPart = true, UnionOperation = true,
		Decal = true, Texture = true, Sound = true, Animation = true,
		ScreenGui = true, Frame = true, TextLabel = true, TextButton = true,
		ImageLabel = true, ImageButton = true, IntValue = true,
		StringValue = true, BoolValue = true, NumberValue = true,
		Color3Value = true, Vector3Value = true, Configuration = true,
	}
	if not supported[className] then return nil end

	-- Find parent info
	local parentId = nil
	local parentName = nil
	if instance.Parent and instance.Parent ~= game then
		-- Check if parent is in our InstanceMap
		for id, synced in pairs(self.InstanceMap) do
			if synced == instance.Parent then
				parentId = id
				parentName = synced.Name
				break
			end
		end
		-- Fallback: use parent name as service reference
		if not parentId then
			parentName = instance.Parent.Name
		end
	end

	local data = {
		name = instance.Name,
		className = className,
		parentId = parentId,
		parentName = parentName,
	}

	if instance:IsA("LuaSourceContainer") then
		data.source = instance.Source
	end

	local attributes = instance:GetAttributes()
	if next(attributes) then data.attributes = attributes end

	local tags = instance:GetTags()
	if #tags > 0 then data.tags = tags end

	return data
end

function InstanceSync:Destroy()
	self.Enabled = false
	self.InstanceMap = {}
	self.UndoStack = {}
end

return InstanceSync
