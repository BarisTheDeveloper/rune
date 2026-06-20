--[[
	Rune Studio Plugin - Main Window
	Modern dockable panel with file tree, status bar, and connection controls
]]

local Theme = require(script.Parent.Parent.utils.Theme)
local FileTree = require(script.Parent.FileTree)
local StatusBar = require(script.Parent.StatusBar)

local MainWindow = {}
MainWindow.__index = MainWindow

-- Events
local Signal = {}
Signal.__index = Signal

function Signal.new()
	local self = setmetatable({}, Signal)
	self._connections = {}
	return self
end

function Signal:Connect(callback)
	table.insert(self._connections, callback)
	return {
		Disconnect = function()
			for i, conn in ipairs(self._connections) do
				if conn == callback then
					table.remove(self._connections, i)
					break
				end
			end
		end
	}
end

function Signal:Fire(...)
	for _, callback in ipairs(self._connections) do
		task.spawn(callback, ...)
	end
end

function MainWindow.new(plugin)
	local self = setmetatable({}, MainWindow)

	self.Plugin = plugin
	self.IsVisible = false
	self.IsConnected = false

	-- Events
	self.OnConnectRequested = Signal.new()
	self.OnDisconnectRequested = Signal.new()
	self.OnSyncToggle = Signal.new()

	-- Create widget
	self.Widget = plugin:CreateDockWidgetPluginGui(
		"RuneSyncPanel",
		DockWidgetPluginGuiInfo.new(
			Enum.InitialDockState.Right,
			false,
			false,
			300,
			500,
			250,
			300
		)
	)
	self.Widget.Title = "Rune Sync"
	self.Widget.Name = "RuneSyncPanel"

	self:BuildUI()

	-- Save state on close
	self.Widget:GetPropertyChangedSignal("Enabled"):Connect(function()
		self.IsVisible = self.Widget.Enabled
		plugin:SetSetting("Rune_IsOpen", self.IsVisible)
	end)

	return self
end

function MainWindow:BuildUI()
	local theme = Theme

	-- Main container
	local mainFrame = Instance.new("Frame")
	mainFrame.Name = "MainFrame"
	mainFrame.Size = UDim2.new(1, 0, 1, 0)
	mainFrame.BackgroundColor3 = theme.Colors.Background
	mainFrame.BorderSizePixel = 0
	mainFrame.Parent = self.Widget

	local corner = Instance.new("UICorner")
	corner.CornerRadius = theme.CornerRadius
	corner.Parent = mainFrame

	-- Header
	local header = Instance.new("Frame")
	header.Name = "Header"
	header.Size = UDim2.new(1, 0, 0, 40)
	header.BackgroundColor3 = theme.Colors.BackgroundLight
	header.BorderSizePixel = 0
	header.Parent = mainFrame

	local headerCorner = Instance.new("UICorner")
	headerCorner.CornerRadius = theme.CornerRadius
	headerCorner.Parent = header

	local headerText = Instance.new("TextLabel")
	headerText.Name = "Title"
	headerText.Size = UDim2.new(1, -10, 1, 0)
	headerText.Position = UDim2.new(0, 10, 0, 0)
	headerText.BackgroundTransparency = 1
	headerText.Text = "Rune Sync"
	headerText.TextColor3 = theme.Colors.Text
	headerText.Font = theme.Fonts.Header
	headerText.TextSize = theme.Sizes.Header
	headerText.TextXAlignment = Enum.TextXAlignment.Left
	headerText.Parent = header

	-- Connection bar
	local connBar = Instance.new("Frame")
	connBar.Name = "ConnectionBar"
	connBar.Size = UDim2.new(1, -20, 0, 36)
	connBar.Position = UDim2.new(0, 10, 0, 48)
	connBar.BackgroundColor3 = theme.Colors.BackgroundLighter
	connBar.BorderSizePixel = 0
	connBar.Parent = mainFrame

	local connCorner = Instance.new("UICorner")
	connCorner.CornerRadius = theme.CornerRadius
	connCorner.Parent = connBar

	-- Host input
	self.HostInput = self:CreateInput(connBar, "Host", "localhost", UDim2.new(0, 5, 0, 4), UDim2.new(0.5, -8, 0, 28))

	-- Port input
	self.PortInput = self:CreateInput(connBar, "Port", "34872", UDim2.new(0.5, 3, 0, 4), UDim2.new(0.5, -8, 0, 28))

	-- Connect button
	self.ConnectButton = Instance.new("TextButton")
	self.ConnectButton.Name = "ConnectButton"
	self.ConnectButton.Size = UDim2.new(1, -10, 0, 32)
	self.ConnectButton.Position = UDim2.new(0, 5, 0, 42)
	self.ConnectButton.BackgroundColor3 = theme.Colors.Accent
	self.ConnectButton.BorderSizePixel = 0
	self.ConnectButton.Text = "Connect"
	self.ConnectButton.TextColor3 = theme.Colors.Text
	self.ConnectButton.Font = theme.Fonts.Body
	self.ConnectButton.TextSize = theme.Sizes.Body
	self.ConnectButton.AutoButtonColor = true
	self.ConnectButton.Parent = connBar

	local btnCorner = Instance.new("UICorner")
	btnCorner.CornerRadius = theme.CornerRadius
	btnCorner.Parent = self.ConnectButton

	self.ConnectButton.MouseButton1Click:Connect(function()
		if self.IsConnected then
			self.OnDisconnectRequested:Fire()
		else
			local host = self.HostInput.Text
			local port = tonumber(self.PortInput.Text) or 34872
			self.OnConnectRequested:Fire(host, port)
		end
	end)

	-- File tree section
	local treeLabel = Instance.new("TextLabel")
	treeLabel.Name = "TreeLabel"
	treeLabel.Size = UDim2.new(1, -20, 0, 20)
	treeLabel.Position = UDim2.new(0, 10, 0, 92)
	treeLabel.BackgroundTransparency = 1
	treeLabel.Text = "Synced Folders"
	treeLabel.TextColor3 = theme.Colors.TextMuted
	treeLabel.Font = theme.Fonts.Body
	treeLabel.TextSize = theme.Sizes.Small
	treeLabel.TextXAlignment = Enum.TextXAlignment.Left
	treeLabel.Parent = mainFrame

	-- File tree container
	local treeFrame = Instance.new("Frame")
	treeFrame.Name = "TreeFrame"
	treeFrame.Size = UDim2.new(1, -20, 1, -140)
	treeFrame.Position = UDim2.new(0, 10, 0, 114)
	treeFrame.BackgroundColor3 = theme.Colors.BackgroundLight
	treeFrame.BorderSizePixel = 0
	treeFrame.ClipsDescendants = true
	treeFrame.Parent = mainFrame

	local treeCorner = Instance.new("UICorner")
	treeCorner.CornerRadius = theme.CornerRadius
	treeCorner.Parent = treeFrame

	-- Scroll frame for tree
	local scrollFrame = Instance.new("ScrollingFrame")
	scrollFrame.Name = "ScrollFrame"
	scrollFrame.Size = UDim2.new(1, 0, 1, 0)
	scrollFrame.BackgroundTransparency = 1
	scrollFrame.BorderSizePixel = 0
	scrollFrame.ScrollBarThickness = 4
	scrollFrame.ScrollBarImageColor3 = theme.Colors.Border
	scrollFrame.CanvasSize = UDim2.new(0, 0, 0, 0)
	scrollFrame.AutomaticCanvasSize = Enum.AutomaticSize.Y
	scrollFrame.Parent = treeFrame

	local scrollLayout = Instance.new("UIListLayout")
	scrollLayout.SortOrder = Enum.SortOrder.LayoutOrder
	scrollLayout.Padding = UDim.new(0, 0)
	scrollLayout.Parent = scrollFrame

	-- Create file tree
	self.FileTree = FileTree.new(scrollFrame)

	-- Status bar
	self.StatusBar = StatusBar.new(mainFrame)

	-- Store references
	self.MainFrame = mainFrame
	self.TreeFrame = treeFrame
end

function MainWindow:CreateInput(parent, placeholder, default, position, size)
	local theme = Theme

	local container = Instance.new("Frame")
	container.Name = placeholder .. "Container"
	container.Size = size
	container.Position = position
	container.BackgroundColor3 = theme.Colors.Surface
	container.BorderSizePixel = 0
	container.Parent = parent

	local corner = Instance.new("UICorner")
	corner.CornerRadius = theme.CornerRadius
	corner.Parent = container

	local input = Instance.new("TextBox")
	input.Name = placeholder .. "Input"
	input.Size = UDim2.new(1, -8, 1, 0)
	input.Position = UDim2.new(0, 4, 0, 0)
	input.BackgroundTransparency = 1
	input.Text = default
	input.PlaceholderText = placeholder
	input.TextColor3 = theme.Colors.Text
	input.PlaceholderColor3 = theme.Colors.TextDark
	input.Font = theme.Fonts.Mono
	input.TextSize = theme.Sizes.Small
	input.ClearTextOnFocus = false
	input.Parent = container

	return input
end

function MainWindow:Show()
	self.Widget.Enabled = true
	self.IsVisible = true
	self.Plugin:SetSetting("Rune_IsOpen", true)
end

function MainWindow:Hide()
	self.Widget.Enabled = false
	self.IsVisible = false
	self.Plugin:SetSetting("Rune_IsOpen", false)
end

function MainWindow:SetStatus(text, color)
	self.StatusBar:SetStatus(text, color)
end

function MainWindow:SetConnectionState(connected)
	self.IsConnected = connected
	if connected then
		self.ConnectButton.Text = "Disconnect"
		self.ConnectButton.BackgroundColor3 = Theme.Colors.Error
	else
		self.ConnectButton.Text = "Connect"
		self.ConnectButton.BackgroundColor3 = Theme.Colors.Accent
	end
end

function MainWindow:UpdateFileTree(treeData)
	self.FileTree:UpdateTree(treeData)
end

function MainWindow:AddFileNode(parentId, nodeData)
	self.FileTree:AddNode(parentId, nodeData)
end

function MainWindow:RemoveFileNode(nodeId)
	self.FileTree:RemoveNode(nodeId)
end

function MainWindow:Destroy()
	if self.Widget then
		self.Widget:Destroy()
	end
end

return MainWindow