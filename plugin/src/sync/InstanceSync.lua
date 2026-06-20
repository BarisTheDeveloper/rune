--[[
	Rune Studio Plugin - Instance Sync
	Handles bidirectional synchronization between filesystem and Roblox Studio
]]

local HttpService = game:GetService("HttpService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")

local InstanceSync = {}
InstanceSync.__index = InstanceSync

-- Roblox service mapping
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
	self.InstanceMap = {} -- Maps Rune IDs to Roblox instances
	self.PendingChanges = {}

	-- Listen for Studio changes
	self:SetupStudioListeners()

	return self
end

function InstanceSync:SetEnabled(enabled)
	self.Enabled = enabled
end

function InstanceSync:RequestSync()
	if not self.Enabled then return end

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
		self.MainWindow:SetStatus("Sync complete", nil)
	elseif msgType == "error" then
		warn("[Rune] Server error: " .. tostring(message.error))
	end
end

function InstanceSync:HandleFullSync(data)
	self.MainWindow:SetStatus("Receiving sync data...", nil)

	-- Clear existing synced instances
	self.InstanceMap = {}

	-- Build tree from root nodes
	if data.instances then
		for _, instanceData in ipairs(data.instances) do
			self:CreateOrUpdateInstance(instanceData)
		end
	end

	-- Update file tree UI
	self.MainWindow:UpdateFileTree(data.instances)

	self.MainWindow:SetStatus("Sync complete - " .. (data.count or 0) .. " instances", nil)
end

function InstanceSync:HandleInstanceCreated(data)
	local instance = self:CreateOrUpdateInstance(data)
	if instance then
		self.MainWindow:AddFileNode(data.parentId, data)
	end
end

function InstanceSync:HandleInstanceUpdated(data)
	self:CreateOrUpdateInstance(data)
end

function InstanceSync:HandleInstanceDeleted(data)
	local instance = self.InstanceMap[data.id]
	if instance and instance.Parent then
		instance:Destroy()
	end
	self.InstanceMap[data.id] = nil
	self.MainWindow:RemoveFileNode(data.id)
end

function InstanceSync:HandleInstanceMoved(data)
	local instance = self.InstanceMap[data.id]
	if not instance then return end

	local newParent = self:FindParent(data.newParentId)
	if newParent then
		instance.Parent = newParent
	end
end

function InstanceSync:HandleInstanceRenamed(data)
	local instance = self.InstanceMap[data.id]
	if instance then
		instance.Name = data.newName
	end
end

function InstanceSync:HandlePropertyChanged(data)
	local instance = self.InstanceMap[data.instanceId]
	if not instance then return end

	local propName = data.property
	local propValue = data.value

	pcall(function()
		instance[propName] = propValue
	end)
end

function InstanceSync:HandleScriptSource(data)
	local instance = self.InstanceMap[data.id]
	if not instance then return end

	if instance:IsA("LuaSourceContainer") then
		instance.Source = data.source
	end
end

function InstanceSync:CreateOrUpdateInstance(data)
	if not self.Enabled then return nil end

	-- Check if instance already exists
	local existing = self.InstanceMap[data.id]
	if existing then
		self:UpdateInstance(existing, data)
		return existing
	end

	-- Find or create parent
	local parent = self:FindParent(data.parentId)
	if not parent then
		-- Try to find service by name
		parent = SERVICE_MAP[data.parentName]
	end

	if not parent then
		warn("[Rune] Parent not found for: " .. tostring(data.name))
		return nil
	end

	-- Create instance
	local className = data.className or "Folder"
	local instance = nil

	local success, result = pcall(function()
		if className == "Script" or className == "LocalScript" or className == "ModuleScript" then
			instance = Instance.new(className)
		elseif className == "Folder" then
			instance = Instance.new("Folder")
		elseif className == "Model" then
			instance = Instance.new("Model")
		elseif className == "Part" then
			instance = Instance.new("Part")
		elseif className == "MeshPart" then
			instance = Instance.new("MeshPart")
		elseif className == "UnionOperation" then
			instance = Instance.new("UnionOperation")
		elseif className == "Decal" then
			instance = Instance.new("Decal")
		elseif className == "Texture" then
			instance = Instance.new("Texture")
		elseif className == "Sound" then
			instance = Instance.new("Sound")
		elseif className == "Animation" then
			instance = Instance.new("Animation")
		elseif className == "ScreenGui" then
			instance = Instance.new("ScreenGui")
		elseif className == "Frame" then
			instance = Instance.new("Frame")
		elseif className == "TextLabel" then
			instance = Instance.new("TextLabel")
		elseif className == "TextButton" then
			instance = Instance.new("TextButton")
		elseif className == "ImageLabel" then
			instance = Instance.new("ImageLabel")
		elseif className == "ImageButton" then
			instance = Instance.new("ImageButton")
		elseif className == "IntValue" then
			instance = Instance.new("IntValue")
		elseif className == "StringValue" then
			instance = Instance.new("StringValue")
		elseif className == "BoolValue" then
			instance = Instance.new("BoolValue")
		elseif className == "NumberValue" then
			instance = Instance.new("NumberValue")
		elseif className == "Color3Value" then
			instance = Instance.new("Color3Value")
		elseif className == "Vector3Value" then
			instance = Instance.new("Vector3Value")
		elseif className == "Configuration" then
			instance = Instance.new("Configuration")
		else
			instance = Instance.new("Folder")
		end
	end)

	if not success or not instance then
		warn("[Rune] Failed to create instance: " .. tostring(className))
		return nil
	end

	-- Set name
	instance.Name = data.name or "NewInstance"

	-- Set properties
	if data.properties then
		for propName, propData in pairs(data.properties) do
			pcall(function()
				if typeof(propData.value) == "Color3" then
					instance[propName] = Color3.new(
						propData.value.r or 1,
						propData.value.g or 1,
						propData.value.b or 1
					)
				elseif typeof(propData.value) == "Vector3" then
					instance[propName] = Vector3.new(
						propData.value.x or 0,
						propData.value.y or 0,
						propData.value.z or 0
					)
				else
					instance[propName] = propData.value
				end
			end)
		end
	end

	-- Set source for scripts
	if data.source and instance:IsA("LuaSourceContainer") then
		instance.Source = data.source
	end

	-- Set attributes
	if data.attributes then
		for attrName, attrValue in pairs(data.attributes) do
			pcall(function()
				instance:SetAttribute(attrName, attrValue)
			end)
		end
	end

	-- Set tags
	if data.tags then
		for _, tag in ipairs(data.tags) do
			pcall(function()
				instance:AddTag(tag)
			end)
		end
	end

	-- Parent the instance
	instance.Parent = parent

	-- Store in map
	self.InstanceMap[data.id] = instance

	return instance
end

function InstanceSync:UpdateInstance(instance, data)
	-- Update name
	if data.name and instance.Name ~= data.name then
		instance.Name = data.name
	end

	-- Update properties
	if data.properties then
		for propName, propData in pairs(data.properties) do
			pcall(function()
				instance[propName] = propData.value
			end)
		end
	end

	-- Update source
	if data.source and instance:IsA("LuaSourceContainer") then
		instance.Source = data.source
	end

	-- Update attributes
	if data.attributes then
		for attrName, attrValue in pairs(data.attributes) do
			pcall(function()
				instance:SetAttribute(attrName, attrValue)
			end)
		end
	end
end

function InstanceSync:FindParent(parentId)
	if not parentId then
		return game
	end

	local parent = self.InstanceMap[parentId]
	if parent then
		return parent
	end

	-- Check if it's a service name
	return SERVICE_MAP[parentId]
end

function InstanceSync:SetupStudioListeners()
	-- Listen for instance changes in Studio
	game.DescendantAdded:Connect(function(instance)
		if not self.Enabled then return end
		if self:IsSyncedInstance(instance) then return end

		-- Notify server of new instance
		self:NotifyInstanceCreated(instance)
	end)

	game.DescendantRemoving:Connect(function(instance)
		if not self.Enabled then return end
		if not self:IsSyncedInstance(instance) then return end

		-- Notify server of removed instance
		self:NotifyInstanceDeleted(instance)
	end)
end

function InstanceSync:IsSyncedInstance(instance)
	for _, synced in pairs(self.InstanceMap) do
		if synced == instance then
			return true
		end
	end
	return false
end

function InstanceSync:NotifyInstanceCreated(instance)
	-- Debounce to avoid spam
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
				data = { id = id },
			})
			break
		end
	end
end

function InstanceSync:SerializeInstance(instance)
	local className = instance.ClassName

	-- Only sync supported types
	local supported = {
		Folder = true,
		Script = true,
		LocalScript = true,
		ModuleScript = true,
		Model = true,
		Part = true,
		MeshPart = true,
		UnionOperation = true,
		Decal = true,
		Texture = true,
		Sound = true,
		Animation = true,
		ScreenGui = true,
		Frame = true,
		TextLabel = true,
		TextButton = true,
		ImageLabel = true,
		ImageButton = true,
		IntValue = true,
		StringValue = true,
		BoolValue = true,
		NumberValue = true,
		Color3Value = true,
		Vector3Value = true,
		Configuration = true,
	}

	if not supported[className] then
		return nil
	end

	local data = {
		name = instance.Name,
		className = className,
	}

	-- Get source for scripts
	if instance:IsA("LuaSourceContainer") then
		data.source = instance.Source
	end

	-- Get attributes
	local attributes = instance:GetAttributes()
	if next(attributes) then
		data.attributes = attributes
	end

	-- Get tags
	local tags = instance:GetTags()
	if #tags > 0 then
		data.tags = tags
	end

	return data
end

function InstanceSync:Destroy()
	self.Enabled = false
	self.InstanceMap = {}
end

return InstanceSync