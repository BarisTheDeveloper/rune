--[[
	Rune Studio Plugin - File Tree
	Visual tree display of synced folders and files
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

	self:BuildContainer()

	return self
end

function FileTree:BuildContainer()
	local theme = Theme

	-- Container for all nodes
	self.Container = Instance.new("Frame")
	self.Container.Name = "TreeContainer"
	self.Container.Size = UDim2.new(1, 0, 1, 0)
	self.Container.BackgroundTransparency = 1
	self.Container.BorderSizePixel = 0
	self.Container.Parent = self.ParentFrame

	local layout = Instance.new("UIListLayout")
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Padding = UDim.new(0, 0)
	layout.Parent = self.Container
end

function FileTree:UpdateTree(treeData)
	-- Clear existing nodes
	for _, frame in pairs(self.NodeFrames) do
		frame:Destroy()
	end
	self.NodeFrames = {}
	self.Nodes = {}

	-- Build new tree
	if treeData then
		for _, rootNode in ipairs(treeData) do
			self:AddNodeInternal(nil, rootNode, 0)
		end
	end
end

function FileTree:AddNode(parentId, nodeData)
	self:AddNodeInternal(parentId, nodeData, self:GetDepth(parentId) + 1)
end

function FileTree:AddNodeInternal(parentId, nodeData, depth)
	local theme = Theme
	local nodeId = nodeData.id or nodeData.Name

	-- Store node data
	self.Nodes[nodeId] = {
		data = nodeData,
		parentId = parentId,
		depth = depth,
		children = {},
	}

	if parentId and self.Nodes[parentId] then
		table.insert(self.Nodes[parentId].children, nodeId)
	end

	-- Create visual node
	local nodeFrame = Instance.new("Frame")
	nodeFrame.Name = "Node_" .. nodeId
	nodeFrame.Size = UDim2.new(1, 0, 0, theme.Sizes.RowHeight)
	nodeFrame.BackgroundTransparency = 1
	nodeFrame.BorderSizePixel = 0
	nodeFrame.LayoutOrder = #self.NodeFrames
	nodeFrame.Parent = self.Container

	-- Hover effect
	local hoverBg = Instance.new("Frame")
	hoverBg.Name = "HoverBg"
	hoverBg.Size = UDim2.new(1, 0, 1, 0)
	hoverBg.BackgroundColor3 = theme.Colors.BackgroundLighter
	hoverBg.BackgroundTransparency = 1
	hoverBg.BorderSizePixel = 0
	hoverBg.ZIndex = 0
	hoverBg.Parent = nodeFrame

	-- Indent based on depth
	local indent = depth * theme.Sizes.TreeIndent

	-- Expand/collapse button (for folders)
	local hasChildren = nodeData.children and #nodeData.children > 0
	local isFolder = nodeData.className == "Folder" or hasChildren

	local expandBtn = nil
	if isFolder then
		expandBtn = Instance.new("TextButton")
		expandBtn.Name = "ExpandBtn"
		expandBtn.Size = UDim2.new(0, 16, 0, 16)
		expandBtn.Position = UDim2.new(0, indent + 2, 0.5, -8)
		expandBtn.BackgroundTransparency = 1
		expandBtn.Text = self.ExpandedNodes[nodeId] and "▼" or "▶"
		expandBtn.TextColor3 = theme.Colors.TextMuted
		expandBtn.Font = theme.Fonts.Mono
		expandBtn.TextSize = 10
		expandBtn.Parent = nodeFrame

		expandBtn.MouseButton1Click:Connect(function()
			self:ToggleNode(nodeId)
		end)
	end

	-- Icon
	local icon = Instance.new("TextLabel")
	icon.Name = "Icon"
	icon.Size = UDim2.new(0, 18, 0, 18)
	icon.Position = UDim2.new(0, indent + (isFolder and 18 or 2), 0.5, -9)
	icon.BackgroundTransparency = 1
	icon.Text = self:GetIcon(nodeData)
	icon.TextColor3 = self:GetIconColor(nodeData)
	icon.Font = theme.Fonts.Body
	icon.TextSize = 14
	icon.Parent = nodeFrame

	-- Name label
	local nameLabel = Instance.new("TextLabel")
	nameLabel.Name = "Name"
	nameLabel.Size = UDim2.new(1, -(indent + 40), 1, 0)
	nameLabel.Position = UDim2.new(0, indent + (isFolder and 38 or 22), 0, 0)
	nameLabel.BackgroundTransparency = 1
	nameLabel.Text = nodeData.name or nodeData.Name or "Unknown"
	nameLabel.TextColor3 = theme.Colors.Text
	nameLabel.Font = theme.Fonts.Body
	nameLabel.TextSize = theme.Sizes.Body
	nameLabel.TextXAlignment = Enum.TextXAlignment.Left
	nameLabel.TextTruncate = Enum.TextTruncate.AtEnd
	nameLabel.Parent = nodeFrame

	-- Hover interactions
	nodeFrame.MouseEnter:Connect(function()
		hoverBg.BackgroundTransparency = 0
	end)

	nodeFrame.MouseLeave:Connect(function()
		hoverBg.BackgroundTransparency = 1
	end)

	-- Click to select
	nodeFrame.InputBegan:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1 then
			self:SelectNode(nodeId)
		end
	end)

	-- Store reference
	self.NodeFrames[nodeId] = nodeFrame
	self.Nodes[nodeId].frame = nodeFrame
	self.Nodes[nodeId].expandBtn = expandBtn

	-- Add children if expanded
	if self.ExpandedNodes[nodeId] and nodeData.children then
		for _, child in ipairs(nodeData.children) do
			self:AddNodeInternal(nodeId, child, depth + 1)
		end
	end
end

function FileTree:RemoveNode(nodeId)
	local node = self.Nodes[nodeId]
	if not node then return end

	-- Remove children first
	for _, childId in ipairs(node.children) do
		self:RemoveNode(childId)
	end

	-- Remove from parent's children list
	if node.parentId and self.Nodes[node.parentId] then
		local parentChildren = self.Nodes[node.parentId].children
		for i, id in ipairs(parentChildren) do
			if id == nodeId then
				table.remove(parentChildren, i)
				break
			end
		end
	end

	-- Destroy frame
	if self.NodeFrames[nodeId] then
		self.NodeFrames[nodeId]:Destroy()
		self.NodeFrames[nodeId] = nil
	end

	self.Nodes[nodeId] = nil
end

function FileTree:ToggleNode(nodeId)
	self.ExpandedNodes[nodeId] = not self.ExpandedNodes[nodeId]

	-- Refresh tree display
	local treeData = {}
	for id, node in pairs(self.Nodes) do
		if not node.parentId then
			table.insert(treeData, node.data)
		end
	end
	self:UpdateTree(treeData)
end

function FileTree:SelectNode(nodeId)
	-- Deselect all
	for id, node in pairs(self.Nodes) do
		if node.frame then
			local hoverBg = node.frame:FindFirstChild("HoverBg")
			if hoverBg then
				hoverBg.BackgroundColor3 = Theme.Colors.BackgroundLighter
			end
		end
	end

	-- Select this node
	local node = self.Nodes[nodeId]
	if node and node.frame then
		local hoverBg = node.frame:FindFirstChild("HoverBg")
		if hoverBg then
			hoverBg.BackgroundColor3 = Theme.Colors.Accent
			hoverBg.BackgroundTransparency = 0.8
		end
	end

	print("[Rune] Selected: " .. (node.data.name or node.data.Name))
end

function FileTree:GetDepth(nodeId)
	if not nodeId or not self.Nodes[nodeId] then
		return 0
	end
	local depth = 0
	local current = nodeId
	while self.Nodes[current] and self.Nodes[current].parentId do
		depth = depth + 1
		current = self.Nodes[current].parentId
	end
	return depth
end

function FileTree:GetIcon(nodeData)
	local className = nodeData.className or nodeData.ClassName or "Folder"

	if className == "Folder" then
		return "📁"
	elseif className == "Script" then
		return "⚡"
	elseif className == "LocalScript" then
		return "👤"
	elseif className == "ModuleScript" then
		return "📦"
	elseif className == "Model" then
		return "🧊"
	elseif className == "Part" or className == "MeshPart" then
		return "🟦"
	else
		return "📄"
	end
end

function FileTree:GetIconColor(nodeData)
	local className = nodeData.className or nodeData.ClassName or "Folder"

	if className == "Folder" then
		return Theme.Colors.Folder
	elseif className == "Script" or className == "LocalScript" or className == "ModuleScript" then
		return Theme.Colors.FileLua
	elseif className == "Model" or className == "Part" or className == "MeshPart" then
		return Theme.Colors.FileModel
	else
		return Theme.Colors.FileJson
	end
end

return FileTree