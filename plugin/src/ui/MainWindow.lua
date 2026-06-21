--[[
	Rune Studio Plugin - Modern Main Window v3
	Card-based layout, search, refined design
]]

local Theme = require(script.Parent.Parent.utils.Theme)
local FileTree = require(script.Parent.FileTree)
local ActivityLog = require(script.Parent.ActivityLog)
local StatusBar = require(script.Parent.StatusBar)

local MainWindow = {}
MainWindow.__index = MainWindow

local Signal = {}
Signal.__index = Signal
function Signal.new() local s = setmetatable({}, Signal); s._l = {}; return s end
function Signal:Connect(f) table.insert(self._l, f); return { Disconnect = function() for i, x in ipairs(self._l) do if x == f then table.remove(self._l, i); break end end end } end
function Signal:Fire(...) for _, f in ipairs(self._l) do task.spawn(f, ...) end end

function MainWindow.new(plugin)
	local self = setmetatable({}, MainWindow)
	local t = Theme

	self.Plugin = plugin
	self.IsVisible = false
	self.IsConnected = false
	self.ActiveTab = "files"

	self.OnConnectRequested = Signal.new()
	self.OnDisconnectRequested = Signal.new()
	self.OnSyncToggle = Signal.new()
	self.OnUndoRequested = Signal.new()

	self.Widget = plugin:CreateDockWidgetPluginGui("RuneSyncPanelV3",
		DockWidgetPluginGuiInfo.new(Enum.InitialDockState.Right, false, false, t.Sizes.PanelW, 500, 280, 320))
	self.Widget.Title = "Rune Sync"
	self.Widget.Name = "RuneSyncPanelV3"

	self:BuildUI()

	self.Widget:GetPropertyChangedSignal("Enabled"):Connect(function()
		self.IsVisible = self.Widget.Enabled
		plugin:SetSetting("Rune_IsOpen", tostring(self.IsVisible))
	end)

	return self
end

function MainWindow:BuildUI()
	local t = Theme

	local root = Instance.new("Frame")
	root.Size = UDim2.new(1, 0, 1, 0)
	root.BackgroundColor3 = t.Colors.Bg
	root.BorderSizePixel = 0
	root.Parent = self.Widget

	-- === HEADER ===
	local header = Instance.new("Frame")
	header.Size = UDim2.new(1, 0, 0, 40)
	header.BackgroundColor3 = t.Colors.BgHeader
	header.BorderSizePixel = 0
	header.Parent = root
	Instance.new("UICorner", header).CornerRadius = t.Radius.Md

	local title = Instance.new("TextLabel")
	title.Size = UDim2.new(1, -16, 1, 0)
	title.Position = UDim2.new(0, 10, 0, 0)
	title.BackgroundTransparency = 1
	title.Text = "Rune Sync"
	title.TextColor3 = t.Colors.TextBright
	title.Font = t.Fonts.Title
	title.TextSize = t.Sizes.Title
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.Parent = header

	-- === CONNECTION CARD ===
	local connCard = Instance.new("Frame")
	connCard.Size = UDim2.new(1, -16, 0, t.Sizes.ConnBarH + 8)
	connCard.Position = UDim2.new(0, 8, 0, 46)
	connCard.BackgroundColor3 = t.Colors.BgCard
	connCard.BorderSizePixel = 1
	connCard.BorderColor3 = t.Colors.Border
	connCard.Parent = root
	Instance.new("UICorner", connCard).CornerRadius = t.Radius.Md

	-- Host
	local hostBg = Instance.new("Frame")
	hostBg.Size = UDim2.new(0.52, -4, 0, t.Sizes.InputH)
	hostBg.Position = UDim2.new(0, 6, 0, 6)
	hostBg.BackgroundColor3 = t.Colors.BgInput
	hostBg.BorderSizePixel = 1
	hostBg.BorderColor3 = t.Colors.Border
	hostBg.Parent = connCard
	Instance.new("UICorner", hostBg).CornerRadius = t.Radius.Sm

	self.HostInput = Instance.new("TextBox")
	self.HostInput.Size = UDim2.new(1, -12, 1, 0)
	self.HostInput.Position = UDim2.new(0, 6, 0, 0)
	self.HostInput.BackgroundTransparency = 1
	self.HostInput.Text = "localhost"
	self.HostInput.PlaceholderText = "Host"
	self.HostInput.TextColor3 = t.Colors.Text
	self.HostInput.PlaceholderColor3 = t.Colors.TextDim
	self.HostInput.Font = t.Fonts.Mono
	self.HostInput.TextSize = t.Sizes.Small
	self.HostInput.ClearTextOnFocus = false
	self.HostInput.Parent = hostBg

	-- Port
	local portBg = Instance.new("Frame")
	portBg.Size = UDim2.new(0.22, -4, 0, t.Sizes.InputH)
	portBg.Position = UDim2.new(0.52, 2, 0, 6)
	portBg.BackgroundColor3 = t.Colors.BgInput
	portBg.BorderSizePixel = 1
	portBg.BorderColor3 = t.Colors.Border
	portBg.Parent = connCard
	Instance.new("UICorner", portBg).CornerRadius = t.Radius.Sm

	self.PortInput = Instance.new("TextBox")
	self.PortInput.Size = UDim2.new(1, -12, 1, 0)
	self.PortInput.Position = UDim2.new(0, 6, 0, 0)
	self.PortInput.BackgroundTransparency = 1
	self.PortInput.Text = "34872"
	self.PortInput.PlaceholderText = "Port"
	self.PortInput.TextColor3 = t.Colors.Text
	self.PortInput.PlaceholderColor3 = t.Colors.TextDim
	self.PortInput.Font = t.Fonts.Mono
	self.PortInput.TextSize = t.Sizes.Small
	self.PortInput.ClearTextOnFocus = false
	self.PortInput.Parent = portBg

	-- Connect btn
	self.ConnectBtn = Instance.new("TextButton")
	self.ConnectBtn.Size = UDim2.new(0.26, -4, 0, t.Sizes.InputH)
	self.ConnectBtn.Position = UDim2.new(0.74, 2, 0, 6)
	self.ConnectBtn.BackgroundColor3 = t.Colors.Accent
	self.ConnectBtn.BorderSizePixel = 0
	self.ConnectBtn.Text = "Connect"
	self.ConnectBtn.TextColor3 = t.Colors.TextBright
	self.ConnectBtn.Font = t.Fonts.Header
	self.ConnectBtn.TextSize = t.Sizes.Small
	self.ConnectBtn.AutoButtonColor = true
	self.ConnectBtn.Parent = connCard
	Instance.new("UICorner", self.ConnectBtn).CornerRadius = t.Radius.Sm

	self.ConnectBtn.MouseButton1Click:Connect(function()
		if self.IsConnected then self.OnDisconnectRequested:Fire()
		else self.OnConnectRequested:Fire(self.HostInput.Text, tonumber(self.PortInput.Text) or 34872) end
	end)

	-- Connection status indicator (pulse dot)
	self.ConnDot = Instance.new("Frame")
	self.ConnDot.Size = UDim2.new(0, 6, 0, 6)
	self.ConnDot.Position = UDim2.new(0, 8, 0, 6)
	self.ConnDot.BackgroundColor3 = t.Colors.TextDim
	self.ConnDot.BorderSizePixel = 0
	self.ConnDot.Parent = connCard
	Instance.new("UICorner", self.ConnDot).CornerRadius = UDim.new(1, 0)

	-- Status text in card
	self.ConnLabel = Instance.new("TextLabel")
	self.ConnLabel.Size = UDim2.new(0, 120, 0, 12)
	self.ConnLabel.Position = UDim2.new(0, 18, 0, 3)
	self.ConnLabel.BackgroundTransparency = 1
	self.ConnLabel.Text = "Disconnected"
	self.ConnLabel.TextColor3 = t.Colors.TextDim
	self.ConnLabel.Font = t.Fonts.Tiny
	self.ConnLabel.TextSize = t.Sizes.Tiny
	self.ConnLabel.TextXAlignment = Enum.TextXAlignment.Left
	self.ConnLabel.Parent = connCard

	-- === TAB BAR ===
	local tabY = 46 + t.Sizes.ConnBarH + 14
	local tabBar = Instance.new("Frame")
	tabBar.Size = UDim2.new(1, 0, 0, t.Sizes.TabH)
	tabBar.Position = UDim2.new(0, 0, 0, tabY)
	tabBar.BackgroundColor3 = t.Colors.Bg
	tabBar.BorderSizePixel = 0
	tabBar.Parent = root

	-- Tab underline
	local tabLine = Instance.new("Frame")
	tabLine.Size = UDim2.new(1, 0, 0, 1)
	tabLine.Position = UDim2.new(0, 0, 1, -1)
	tabLine.BackgroundColor3 = t.Colors.Border
	tabLine.BorderSizePixel = 0
	tabLine.Parent = tabBar

	self:CreateTab(tabBar, "📁 Files", "files", 0, 10)
	self:CreateTab(tabBar, "📋 Activity", "activity", 110, 10)

	-- Tab indicator
	self.TabInd = Instance.new("Frame")
	self.TabInd.Size = UDim2.new(0, 100, 0, 2)
	self.TabInd.Position = UDim2.new(0, 10, 1, -1)
	self.TabInd.BackgroundColor3 = t.Colors.Accent
	self.TabInd.BorderSizePixel = 0
	self.TabInd.Parent = tabBar

	-- === CONTENT ===
	local contentY = tabY + t.Sizes.TabH
	self.ContentFrame = Instance.new("Frame")
	self.ContentFrame.Size = UDim2.new(1, 0, 1, -(contentY + t.Sizes.StatusBarH))
	self.ContentFrame.Position = UDim2.new(0, 0, 0, contentY)
	self.ContentFrame.BackgroundColor3 = t.Colors.Bg
	self.ContentFrame.BorderSizePixel = 0
	self.ContentFrame.ClipsDescendants = true
	self.ContentFrame.Parent = root

	self.FilesPanel = Instance.new("Frame")
	self.FilesPanel.Size = UDim2.new(1, 0, 1, 0)
	self.FilesPanel.BackgroundTransparency = 1
	self.FilesPanel.Parent = self.ContentFrame
	self.FileTree = FileTree.new(self.FilesPanel)

	self.ActivityPanel = Instance.new("Frame")
	self.ActivityPanel.Size = UDim2.new(1, 0, 1, 0)
	self.ActivityPanel.BackgroundTransparency = 1
	self.ActivityPanel.Visible = false
	self.ActivityPanel.Parent = self.ContentFrame
	self.ActivityLog = ActivityLog.new(self.ActivityPanel)

	-- === STATUS BAR ===
	self.StatusBar = StatusBar.new(root)
	self.StatusBar:OnUndo(function() self.OnUndoRequested:Fire() end)
	self.StatusBar:EnableUndo(false)

	self.Root = root
end

function MainWindow:CreateTab(parent, label, id, x, y)
	local t = Theme
	local btn = Instance.new("TextButton")
	btn.Size = UDim2.new(0, 100, 0, t.Sizes.TabH - 4)
	btn.Position = UDim2.new(0, x, 0, y)
	btn.BackgroundTransparency = 1
	btn.Text = label
	btn.TextColor3 = t.Colors.TextDim
	btn.Font = t.Fonts.Body
	btn.TextSize = t.Sizes.Small
	btn.Parent = parent

	btn.MouseButton1Click:Connect(function() self:SwitchTab(id) end)
	btn.MouseEnter:Connect(function() if self.ActiveTab ~= id then btn.TextColor3 = t.Colors.TextMuted end end)
	btn.MouseLeave:Connect(function() if self.ActiveTab ~= id then btn.TextColor3 = t.Colors.TextDim end end)

	if id == "files" then self.FilesTabBtn = btn
	else self.ActivityTabBtn = btn end
end

function MainWindow:SwitchTab(id)
	if self.ActiveTab == id then return end
	local t = Theme
	self.ActiveTab = id

	if id == "files" then
		self.FilesTabBtn.TextColor3 = t.Colors.TextBright
		self.ActivityTabBtn.TextColor3 = t.Colors.TextDim
		self.TabInd.Position = UDim2.new(0, 10, 1, -1)
		self.FilesPanel.Visible = true
		self.ActivityPanel.Visible = false
	else
		self.ActivityTabBtn.TextColor3 = t.Colors.TextBright
		self.FilesTabBtn.TextColor3 = t.Colors.TextDim
		self.TabInd.Position = UDim2.new(0, 120, 1, -1)
		self.FilesPanel.Visible = false
		self.ActivityPanel.Visible = true
	end
end

function MainWindow:Show() self.Widget.Enabled = true; self.IsVisible = true; self.Plugin:SetSetting("Rune_IsOpen", "true") end
function MainWindow:Hide() self.Widget.Enabled = false; self.IsVisible = false; self.Plugin:SetSetting("Rune_IsOpen", "false") end

function MainWindow:SetConnectionState(connected)
	self.IsConnected = connected
	if connected then
		self.ConnectBtn.Text = "Disconnect"
		self.ConnectBtn.BackgroundColor3 = Theme.Colors.Error
		self.ConnDot.BackgroundColor3 = Theme.Colors.Success
		self.ConnLabel.Text = "Connected"
		self.ConnLabel.TextColor3 = Theme.Colors.Success
	else
		self.ConnectBtn.Text = "Connect"
		self.ConnectBtn.BackgroundColor3 = Theme.Colors.Accent
		self.ConnDot.BackgroundColor3 = Theme.Colors.TextDim
		self.ConnLabel.Text = "Disconnected"
		self.ConnLabel.TextColor3 = Theme.Colors.TextDim
	end
	self.StatusBar:SetConnectionState(connected)
end

function MainWindow:SetStatus(text, color) self.StatusBar:SetStatus(text, color) end
function MainWindow:SetInstanceCount(n) self.StatusBar:SetInstanceCount(n) end
function MainWindow:UpdateFileTree(d) self.FileTree:UpdateTree(d) end
function MainWindow:AddFileNode(p, d) self.FileTree:AddNode(p, d) end
function MainWindow:RemoveFileNode(id) self.FileTree:RemoveNode(id) end
function MainWindow:LogActivity(c, m) if self.ActivityLog then self.ActivityLog:AddEntry(c, m) end end
function MainWindow:EnableUndo(e) self.StatusBar:EnableUndo(e) end
function MainWindow:Destroy() if self.Widget then self.Widget:Destroy() end end

return MainWindow
