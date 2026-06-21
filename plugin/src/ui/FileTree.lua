--[[
	Rune Studio Plugin - Enhanced File Tree v3
	With search/filter, card-based nodes, smooth selection
]]

local Theme = require(script.Parent.Parent.utils.Theme)

local FileTree = {}
FileTree.__index = FileTree

function FileTree.new(parentFrame)
	local self = setmetatable({}, FileTree)

	self.ParentFrame = parentFrame
	self.Nodes = {}
	self.ExpandedNodes = {}
	self.NodeFrames = {}
	self.SelectedNode = nil
	self.AllData = nil
	self.SearchTerm = ""

	self:BuildUI()

	return self
end

function FileTree:BuildUI()
	local t = Theme

	self.Container = Instance.new("Frame")
	self.Container.Size = UDim2.new(1, 0, 1, 0)
	self.Container.BackgroundColor3 = t.Colors.Bg
	self.Container.BorderSizePixel = 0
	self.Container.Parent = self.ParentFrame

	-- Search bar
	self.SearchFrame = Instance.new("Frame")
	self.SearchFrame.Size = UDim2.new(1, -12, 0, t.Sizes.SearchH)
	self.SearchFrame.Position = UDim2.new(0, 6, 0, 4)
	self.SearchFrame.BackgroundColor3 = t.Colors.BgInput
	self.SearchFrame.BorderSizePixel = 1
	self.SearchFrame.BorderColor3 = t.Colors.Border
	self.SearchFrame.Parent = self.Container

	local sc = Instance.new("UICorner")
	sc.CornerRadius = t.Radius.Sm
	sc.Parent = self.SearchFrame

	self.SearchBox = Instance.new("TextBox")
	self.SearchBox.Size = UDim2.new(1, -16, 1, 0)
	self.SearchBox.Position = UDim2.new(0, 8, 0, 0)
	self.SearchBox.BackgroundTransparency = 1
	self.SearchBox.PlaceholderText = "Filter files..."
	self.SearchBox.Text = ""
	self.SearchBox.TextColor3 = t.Colors.Text
	self.SearchBox.PlaceholderColor3 = t.Colors.TextDim
	self.SearchBox.Font = t.Fonts.Body
	self.SearchBox.TextSize = t.Sizes.Small
	self.SearchBox.ClearTextOnFocus = false
	self.SearchBox.Parent = self.SearchFrame

	self.SearchBox:GetPropertyChangedSignal("Text"):Connect(function()
		self.SearchTerm = self.SearchBox.Text:lower()
		self:Refresh()
	end)

	-- Tree area
	self.TreeFrame = Instance.new("ScrollingFrame")
	self.TreeFrame.Size = UDim2.new(1, 0, 1, -(t.Sizes.SearchH + 8))
	self.TreeFrame.Position = UDim2.new(0, 0, 0, t.Sizes.SearchH + 8)
	self.TreeFrame.BackgroundTransparency = 1
	self.TreeFrame.BorderSizePixel = 0
	self.TreeFrame.ScrollBarThickness = 4
	self.TreeFrame.ScrollBarImageColor3 = t.Colors.BorderLight
	self.TreeFrame.CanvasSize = UDim2.new(0, 0, 0, 0)
	self.TreeFrame.AutomaticCanvasSize = Enum.AutomaticSize.Y
	self.TreeFrame.Parent = self.Container

	self.TreeLayout = Instance.new("UIListLayout")
	self.TreeLayout.SortOrder = Enum.SortOrder.LayoutOrder
	self.TreeLayout.Padding = UDim.new(0, 1)
	self.TreeLayout.Parent = self.TreeFrame
end

function FileTree:Refresh()
	if self.AllData then
		self:UpdateTree(self.AllData)
	end
end

function FileTree:UpdateTree(treeData)
	self.AllData = treeData
	self:ClearNodes()

	if treeData then
		for _, rootNode in ipairs(treeData) do
			self:RenderNode(nil, rootNode, 0)
		end
	end
end

function FileTree:AddNode(parentId, nodeData)
	local depth = self:GetDepth(parentId) + 1
	self:RenderNode(parentId, nodeData, depth)
end

function FileTree:RemoveNode(nodeId)
	local node = self.Nodes[nodeId]
	if not node then return end

	for _, childId in ipairs(node.children) do
		self:RemoveNode(childId)
	end

	if node.parentId and self.Nodes[node.parentId] then
		local siblings = self.Nodes[node.parentId].children
		for i, id in ipairs(siblings) do
			if id == nodeId then table.remove(siblings, i); break end
		end
	end

	if self.NodeFrames[nodeId] then
		self.NodeFrames[nodeId]:Destroy()
		self.NodeFrames[nodeId] = nil
	end
	self.Nodes[nodeId] = nil
	if self.SelectedNode == nodeId then self.SelectedNode = nil end
end

function FileTree:RenderNode(parentId, nodeData, depth)
	local t = Theme
	local nodeId = nodeData.id or nodeData.Name or ("n" .. depth)
	local name = nodeData.name or nodeData.Name or "?"
	local className = nodeData.className or "Folder"

	-- Search filter
	if self.SearchTerm ~= "" then
		local match = name:lower():find(self.SearchTerm, 1, true)
		if not match then
			-- Still add to nodes for hierarchy but skip render
			self.Nodes[nodeId] = { data = nodeData, parentId = parentId, depth = depth, children = {}, hidden = true }
			if parentId and self.Nodes[parentId] then
				table.insert(self.Nodes[parentId].children, nodeId)
			end
			return
		end
	end

	local hasChildren = nodeData.children and #nodeData.children > 0
	local isFolder = (className == "Folder" or hasChildren)
	local indent = depth * t.Sizes.IndentW
	local rowH = t.Sizes.TreeRowH

	self.Nodes[nodeId] = { data = nodeData, parentId = parentId, depth = depth, children = {}, hidden = false }
	if parentId and self.Nodes[parentId] then
		table.insert(self.Nodes[parentId].children, nodeId)
	end

	-- Row frame
	local frame = Instance.new("Frame")
	frame.Name = "Node_" .. nodeId
	frame.Size = UDim2.new(1, -8, 0, rowH)
	frame.Position = UDim2.new(0, 4, 0, 0)
	frame.BackgroundColor3 = t.Colors.Bg
	frame.BorderSizePixel = 0
	frame.LayoutOrder = nodeId
	frame.Parent = self.TreeFrame

	-- Selection highlight
	local sel = Instance.new("Frame")
	sel.Name = "Sel"
	sel.Size = UDim2.new(1, 0, 1, 0)
	sel.BackgroundColor3 = t.Colors.AccentMuted
	sel.BackgroundTransparency = 1
	sel.BorderSizePixel = 0
	sel.ZIndex = 0
	sel.Parent = frame
	Instance.new("UICorner", sel).CornerRadius = t.Radius.Sm

	-- Hover
	local hover = Instance.new("Frame")
	hover.Name = "Hover"
	hover.Size = UDim2.new(1, 0, 1, 0)
	hover.BackgroundColor3 = t.Colors.BgHover
	hover.BackgroundTransparency = 1
	hover.BorderSizePixel = 0
	hover.ZIndex = 0
	hover.Parent = frame
	Instance.new("UICorner", hover).CornerRadius = t.Radius.Sm

	-- Expand btn
	local expandBtn = nil
	if isFolder then
		expandBtn = Instance.new("TextButton")
		expandBtn.Size = UDim2.new(0, 14, 0, 14)
		expandBtn.Position = UDim2.new(0, indent + 4, 0.5, -7)
		expandBtn.BackgroundTransparency = 1
		expandBtn.Text = self.ExpandedNodes[nodeId] and "▾" or "▸"
		expandBtn.TextColor3 = t.Colors.TextDim
		expandBtn.Font = t.Fonts.Body
		expandBtn.TextSize = 10
		expandBtn.ZIndex = 2
		expandBtn.Parent = frame
		expandBtn.MouseButton1Click:Connect(function() self:ToggleExpand(nodeId) end)
	end

	-- Icon
	local iconX = indent + (isFolder and 20 or 6)
	local iconLabel = Instance.new("TextLabel")
	iconLabel.Size = UDim2.new(0, t.Sizes.IconW, 0, t.Sizes.IconW)
	iconLabel.Position = UDim2.new(0, iconX, 0.5, -t.Sizes.IconW / 2)
	iconLabel.BackgroundTransparency = 1
	iconLabel.Text = self:GetIcon(nodeData)
	iconLabel.TextColor3 = self:GetIconColor(nodeData)
	iconLabel.Font = t.Fonts.Body
	iconLabel.TextSize = 14
	iconLabel.ZIndex = 2
	iconLabel.Parent = frame

	-- Name
	local nameX = iconX + t.Sizes.IconW + 4
	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size = UDim2.new(1, -(nameX + 8), 1, 0)
	nameLabel.Position = UDim2.new(0, nameX, 0, 0)
	nameLabel.BackgroundTransparency = 1
	nameLabel.Text = name
	nameLabel.TextColor3 = t.Colors.Text
	nameLabel.Font = t.Fonts.Body
	nameLabel.TextSize = t.Sizes.Small
	nameLabel.TextXAlignment = Enum.TextXAlignment.Left
	nameLabel.TextTruncate = Enum.TextTruncate.AtEnd
	nameLabel.ZIndex = 2
	nameLabel.Parent = frame

	-- Interaction
	frame.MouseEnter:Connect(function()
		if self.SelectedNode ~= nodeId then hover.BackgroundTransparency = 0 end
	end)
	frame.MouseLeave:Connect(function()
		if self.SelectedNode ~= nodeId then hover.BackgroundTransparency = 1 end
	end)
	frame.InputBegan:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1 then
			self:SelectNode(nodeId)
		end
	end)

	self.NodeFrames[nodeId] = frame
	self.Nodes[nodeId].frame = frame
	self.Nodes[nodeId].sel = sel
	self.Nodes[nodeId].hover = hover
	self.Nodes[nodeId].expandBtn = expandBtn

	-- Render expanded children
	if self.ExpandedNodes[nodeId] and nodeData.children then
		for _, child in ipairs(nodeData.children) do
			self:RenderNode(nodeId, child, depth + 1)
		end
	end
end

function FileTree:ToggleExpand(nodeId)
	self.ExpandedNodes[nodeId] = not self.ExpandedNodes[nodeId]
	self:Refresh()
end

function FileTree:SelectNode(nodeId)
	if self.SelectedNode and self.Nodes[self.SelectedNode] then
		local p = self.Nodes[self.SelectedNode]
		if p.sel then p.sel.BackgroundTransparency = 1 end
		if p.hover then p.hover.BackgroundTransparency = 1 end
	end
	self.SelectedNode = nodeId
	local n = self.Nodes[nodeId]
	if n and n.sel then
		n.sel.BackgroundTransparency = 0.85
		if n.hover then n.hover.BackgroundTransparency = 1 end
	end
end

function FileTree:GetDepth(nodeId)
	if not nodeId or not self.Nodes[nodeId] then return 0 end
	local d, c = 0, nodeId
	while self.Nodes[c] and self.Nodes[c].parentId do d = d + 1; c = self.Nodes[c].parentId end
	return d
end

function FileTree:GetIcon(d)
	local c = d.className or d.ClassName or "Folder"
	if c == "Folder" then return "📁"
	elseif c == "Script" then return "⚡"
	elseif c == "LocalScript" then return "👤"
	elseif c == "ModuleScript" then return "📦"
	elseif c == "Model" then return "🧊"
	else return "📄" end
end

function FileTree:GetIconColor(d)
	local c = d.className or d.ClassName or "Folder"
	if c == "Folder" then return Theme.Colors.Folder
	elseif c == "Script" then return Theme.Colors.Script
	elseif c == "LocalScript" then return Theme.Colors.LocalScript
	elseif c == "ModuleScript" then return Theme.Colors.ModuleScript
	else return Theme.Colors.TextMuted end
end

function FileTree:ClearNodes()
	for _, f in pairs(self.NodeFrames) do f:Destroy() end
	self.NodeFrames = {}
	self.Nodes = {}
	self.SelectedNode = nil
end

return FileTree
