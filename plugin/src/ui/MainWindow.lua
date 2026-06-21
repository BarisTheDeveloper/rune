--[[
	Rune Studio Plugin v3 — Minimal Modern UI
	Single-line connection, toast notifications, logo header
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
function Signal:Connect(f) table.insert(self._l, f); return {Disconnect = function() for i, x in ipairs(self._l) do if x == f then table.remove(self._l, i); break end end end} end
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

	self.Widget = plugin:CreateDockWidgetPluginGui("RunePanel",
		DockWidgetPluginGuiInfo.new(Enum.InitialDockState.Right, false, false, 300, 500, 260, 320))
	self.Widget.Title = "◆ RUNE"
	self.Widget.Name = "RunePanel"

	self:BuildUI()

	self.Widget:GetPropertyChangedSignal("Enabled"):Connect(function()
		self.IsVisible = self.Widget.Enabled
		plugin:SetSetting("Rune_IsOpen", tostring(self.IsVisible))
	end)

	return self
end

function MainWindow:BuildUI()
	local t = Theme
	local W = function(name, parent) return Instance.new(name, parent) end

	local root = W("Frame")
	root.Size = UDim2.new(1, 0, 1, 0)
	root.BackgroundColor3 = t.Colors.Bg
	root.BorderSizePixel = 0
	root.Parent = self.Widget

	-- === HEADER ===
	local header = W("Frame")
	header.Size = UDim2.new(1, 0, 0, 36)
	header.BackgroundColor3 = t.Colors.Bg
	header.BorderSizePixel = 0
	header.Parent = root

	local logo = W("TextLabel")
	logo.Size = UDim2.new(0, 24, 0, 24)
	logo.Position = UDim2.new(0, 10, 0, 6)
	logo.BackgroundTransparency = 1
	logo.Text = "◆"
	logo.TextColor3 = t.Colors.Accent
	logo.Font = t.Fonts.Body
	logo.TextSize = 20
	logo.Parent = header

	local title = W("TextLabel")
	title.Size = UDim2.new(1, -90, 1, 0)
	title.Position = UDim2.new(0, 36, 0, 0)
	title.BackgroundTransparency = 1
	title.Text = "RUNE"
	title.TextColor3 = t.Colors.TextBright
	title.Font = t.Fonts.Title
	title.TextSize = t.Sizes.Title
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.Parent = header

	-- Version badge
	local ver = W("TextLabel")
	ver.Size = UDim2.new(0, 50, 0, 16)
	ver.Position = UDim2.new(1, -56, 0, 10)
	ver.BackgroundColor3 = t.Colors.BgCard
	ver.BorderSizePixel = 1
	ver.BorderColor3 = t.Colors.Border
	ver.Text = "v2.2"
	ver.TextColor3 = t.Colors.TextDim
	ver.Font = t.Fonts.Mono
	ver.TextSize = t.Sizes.Tiny
	ver.Parent = header
	Instance.new("UICorner", ver).CornerRadius = t.Radius.Xs

	-- Header line
	local hl = W("Frame")
	hl.Size = UDim2.new(1, 0, 0, 1)
	hl.Position = UDim2.new(0, 0, 1, 0)
	hl.BackgroundColor3 = t.Colors.Border
	hl.BorderSizePixel = 0
	hl.Parent = header

	-- === CONNECTION BAR ===
	local connBar = W("Frame")
	connBar.Size = UDim2.new(1, -12, 0, 32)
	connBar.Position = UDim2.new(0, 6, 0, 42)
	connBar.BackgroundColor3 = t.Colors.BgCard
	connBar.BorderSizePixel = 1
	connBar.BorderColor3 = t.Colors.Border
	connBar.Parent = root
	Instance.new("UICorner", connBar).CornerRadius = t.Radius.Md

	-- Connection dot
	self.ConnDot = W("Frame")
	self.ConnDot.Size = UDim2.new(0, 8, 0, 8)
	self.ConnDot.Position = UDim2.new(0, 8, 0.5, -4)
	self.ConnDot.BackgroundColor3 = t.Colors.TextDim
	self.ConnDot.BorderSizePixel = 0
	self.ConnDot.Parent = connBar
	Instance.new("UICorner", self.ConnDot).CornerRadius = UDim.new(1, 0)

	-- Single input: host:port
	self.AddressInput = W("TextBox")
	self.AddressInput.Size = UDim2.new(1, -90, 1, 0)
	self.AddressInput.Position = UDim2.new(0, 22, 0, 0)
	self.AddressInput.BackgroundTransparency = 1
	self.AddressInput.Text = "localhost:34872"
	self.AddressInput.PlaceholderText = "host:port"
	self.AddressInput.TextColor3 = t.Colors.Text
	self.AddressInput.PlaceholderColor3 = t.Colors.TextDim
	self.AddressInput.Font = t.Fonts.Mono
	self.AddressInput.TextSize = t.Sizes.Small
	self.AddressInput.ClearTextOnFocus = false
	self.AddressInput.Parent = connBar

	-- Connect button
	self.ConnectBtn = W("TextButton")
	self.ConnectBtn.Size = UDim2.new(0, 56, 0, 22)
	self.ConnectBtn.Position = UDim2.new(1, -62, 0.5, -11)
	self.ConnectBtn.BackgroundColor3 = t.Colors.Accent
	self.ConnectBtn.BorderSizePixel = 0
	self.ConnectBtn.Text = "Connect"
	self.ConnectBtn.TextColor3 = t.Colors.TextBright
	self.ConnectBtn.Font = t.Fonts.Header
	self.ConnectBtn.TextSize = t.Sizes.Small
	self.ConnectBtn.AutoButtonColor = true
	self.ConnectBtn.Parent = connBar
	Instance.new("UICorner", self.ConnectBtn).CornerRadius = t.Radius.Sm

	self.ConnectBtn.MouseButton1Click:Connect(function()
		if self.IsConnected then
			self.OnDisconnectRequested:Fire()
		else
			local addr = self.AddressInput.Text
			local host, port = addr:match("^([^:]+):(%d+)$")
			self.OnConnectRequested:Fire(host or "localhost", tonumber(port) or 34873)
		end
	end)

	-- Quick actions
	local actions = W("Frame")
	actions.Size = UDim2.new(1, -12, 0, 18)
	actions.Position = UDim2.new(0, 6, 0, 78)
	actions.BackgroundTransparency = 1
	actions.Parent = root

	local function btn(text, x, w)
		local b = W("TextButton")
		b.Size = UDim2.new(0, w, 1, 0)
		b.Position = UDim2.new(0, x, 0, 0)
		b.BackgroundColor3 = t.Colors.BgCard
		b.BorderSizePixel = 1
		b.BorderColor3 = t.Colors.Border
		b.Text = text
		b.TextColor3 = t.Colors.TextDim
		b.Font = t.Fonts.Tiny
		b.TextSize = t.Sizes.Tiny
		b.AutoButtonColor = false
		b.Parent = actions
		Instance.new("UICorner", b).CornerRadius = t.Radius.Xs
		b.MouseEnter:Connect(function() b.BackgroundColor3 = t.Colors.BgHover; b.TextColor3 = t.Colors.TextMuted end)
		b.MouseLeave:Connect(function() b.BackgroundColor3 = t.Colors.BgCard; b.TextColor3 = t.Colors.TextDim end)
		return b
	end

	self.SyncBtn = btn("↻ Sync", 0, 56)
	self.SyncBtn.MouseButton1Click:Connect(function()
		if syncHandler then syncHandler:RequestSync() end
	end)

	local expBtn = btn("⊞", 60, 28)
	expBtn.MouseButton1Click:Connect(function()
		if self.FileTree then
			for id in pairs(self.FileTree.Nodes) do self.FileTree.ExpandedNodes[id] = true end
			self.FileTree:Refresh()
		end
	end)

	local colBtn = btn("⊟", 92, 28)
	colBtn.MouseButton1Click:Connect(function()
		if self.FileTree then self.FileTree.ExpandedNodes = {}; self.FileTree:Refresh() end
	end)

	-- === TABS ===
	local tabY = 100
	local tabBar = W("Frame")
	tabBar.Size = UDim2.new(1, 0, 0, t.Sizes.TabH)
	tabBar.Position = UDim2.new(0, 0, 0, tabY)
	tabBar.BackgroundColor3 = t.Colors.Bg
	tabBar.BorderSizePixel = 0
	tabBar.Parent = root

	local tabLine = W("Frame")
	tabLine.Size = UDim2.new(1, 0, 0, 1)
	tabLine.Position = UDim2.new(0, 0, 1, -1)
	tabLine.BackgroundColor3 = t.Colors.Border
	tabLine.BorderSizePixel = 0
	tabLine.Parent = tabBar

	self:MakeTab(tabBar, "Files", "files", 10)
	self:MakeTab(tabBar, "Activity", "activity", 90)

	self.TabInd = W("Frame")
	self.TabInd.Size = UDim2.new(0, 70, 0, 2)
	self.TabInd.Position = UDim2.new(0, 10, 1, -1)
	self.TabInd.BackgroundColor3 = t.Colors.Accent
	self.TabInd.BorderSizePixel = 0
	self.TabInd.Parent = tabBar

	-- === CONTENT ===
	local contentY = tabY + t.Sizes.TabH
	self.ContentFrame = W("Frame")
	self.ContentFrame.Size = UDim2.new(1, 0, 1, -(contentY + t.Sizes.StatusBarH))
	self.ContentFrame.Position = UDim2.new(0, 0, 0, contentY)
	self.ContentFrame.BackgroundColor3 = t.Colors.Bg
	self.ContentFrame.BorderSizePixel = 0
	self.ContentFrame.ClipsDescendants = true
	self.ContentFrame.Parent = root

	self.FilesPanel = W("Frame")
	self.FilesPanel.Size = UDim2.new(1, 0, 1, 0)
	self.FilesPanel.BackgroundTransparency = 1
	self.FilesPanel.Parent = self.ContentFrame
	self.FileTree = FileTree.new(self.FilesPanel)

	self.ActivityPanel = W("Frame")
	self.ActivityPanel.Size = UDim2.new(1, 0, 1, 0)
	self.ActivityPanel.BackgroundTransparency = 1
	self.ActivityPanel.Visible = false
	self.ActivityPanel.Parent = self.ContentFrame
	self.ActivityLog = ActivityLog.new(self.ActivityPanel)

	-- Notification toast
	self.Toast = W("Frame")
	self.Toast.Size = UDim2.new(1, -16, 0, 28)
	self.Toast.Position = UDim2.new(0, 8, 1, -(t.Sizes.StatusBarH + 34))
	self.Toast.BackgroundColor3 = t.Colors.BgCard
	self.Toast.BorderSizePixel = 1
	self.Toast.BorderColor3 = t.Colors.Border
	self.Toast.Visible = false
	self.Toast.ZIndex = 10
	self.Toast.Parent = root
	Instance.new("UICorner", self.Toast).CornerRadius = t.Radius.Sm

	self.ToastIcon = W("TextLabel")
	self.ToastIcon.Size = UDim2.new(0, 14, 1, 0)
	self.ToastIcon.Position = UDim2.new(0, 8, 0, 0)
	self.ToastIcon.BackgroundTransparency = 1
	self.ToastIcon.Text = ""
	self.ToastIcon.Font = t.Fonts.Body
	self.ToastIcon.TextSize = 12
	self.ToastIcon.ZIndex = 11
	self.ToastIcon.Parent = self.Toast

	self.ToastText = W("TextLabel")
	self.ToastText.Size = UDim2.new(1, -28, 1, 0)
	self.ToastText.Position = UDim2.new(0, 24, 0, 0)
	self.ToastText.BackgroundTransparency = 1
	self.ToastText.Text = ""
	self.ToastText.TextColor3 = t.Colors.Text
	self.ToastText.Font = t.Fonts.Body
	self.ToastText.TextSize = t.Sizes.Small
	self.ToastText.TextXAlignment = Enum.TextXAlignment.Left
	self.ToastText.ZIndex = 11
	self.ToastText.Parent = self.Toast

	self.ToastTimer = nil

	-- Status bar
	self.StatusBar = StatusBar.new(root)
	self.StatusBar:OnUndo(function() self.OnUndoRequested:Fire() end)
	self.StatusBar:EnableUndo(false)

	self.Root = root
end

function MainWindow:MakeTab(parent, label, id, x)
	local t = Theme
	local btn = Instance.new("TextButton")
	btn.Size = UDim2.new(0, 70, 0, t.Sizes.TabH - 4)
	btn.Position = UDim2.new(0, x, 0, 2)
	btn.BackgroundTransparency = 1
	btn.Text = label
	btn.TextColor3 = t.Colors.TextDim
	btn.Font = t.Fonts.Body
	btn.TextSize = t.Sizes.Small
	btn.Parent = parent

	btn.MouseButton1Click:Connect(function() self:SwitchTab(id) end)
	btn.MouseEnter:Connect(function() if self.ActiveTab ~= id then btn.TextColor3 = t.Colors.TextMuted end end)
	btn.MouseLeave:Connect(function() if self.ActiveTab ~= id then btn.TextColor3 = t.Colors.TextDim end end)

	if id == "files" then self.FilesTabBtn = btn else self.ActivityTabBtn = btn end
end

function MainWindow:SwitchTab(id)
	if self.ActiveTab == id then return end
	self.ActiveTab = id
	if id == "files" then
		self.FilesTabBtn.TextColor3 = Theme.Colors.TextBright
		self.ActivityTabBtn.TextColor3 = Theme.Colors.TextDim
		self.TabInd.Position = UDim2.new(0, 10, 1, -1)
		self.FilesPanel.Visible = true
		self.ActivityPanel.Visible = false
	else
		self.ActivityTabBtn.TextColor3 = Theme.Colors.TextBright
		self.FilesTabBtn.TextColor3 = Theme.Colors.TextDim
		self.TabInd.Position = UDim2.new(0, 90, 1, -1)
		self.FilesPanel.Visible = false
		self.ActivityPanel.Visible = true
	end
end

function MainWindow:ShowToast(icon, text, color, duration)
	local t = Theme
	if self.ToastTimer then self.ToastTimer:Disconnect() end

	self.ToastIcon.Text = icon
	self.ToastIcon.TextColor3 = color or t.Colors.Text
	self.ToastText.Text = text
	self.Toast.BackgroundColor3 = t.Colors.BgCard
	self.Toast.Visible = true

	self.ToastTimer = task.delay(duration or 3, function()
		self.Toast.Visible = false
		self.ToastTimer = nil
	end)
end

function MainWindow:Show() self.Widget.Enabled = true; self.IsVisible = true; self.Plugin:SetSetting("Rune_IsOpen", "true") end
function MainWindow:Hide() self.Widget.Enabled = false; self.IsVisible = false; self.Plugin:SetSetting("Rune_IsOpen", "false") end

function MainWindow:SetConnectionState(connected)
	self.IsConnected = connected
	if connected then
		self.ConnectBtn.Text = "Disconnect"
		self.ConnectBtn.BackgroundColor3 = Theme.Colors.Error
		self.ConnDot.BackgroundColor3 = Theme.Colors.Success
	else
		self.ConnectBtn.Text = "Connect"
		self.ConnectBtn.BackgroundColor3 = Theme.Colors.Accent
		self.ConnDot.BackgroundColor3 = Theme.Colors.TextDim
	end
	self.StatusBar:SetConnectionState(connected)
end

function MainWindow:SetStatus(t, c) self.StatusBar:SetStatus(t, c) end
function MainWindow:SetInstanceCount(n) self.StatusBar:SetInstanceCount(n) end
function MainWindow:UpdateFileTree(d) self.FileTree:UpdateTree(d) end
function MainWindow:AddFileNode(p, d) self.FileTree:AddNode(p, d) end
function MainWindow:RemoveFileNode(id) self.FileTree:RemoveNode(id) end
function MainWindow:LogActivity(c, m) if self.ActivityLog then self.ActivityLog:AddEntry(c, m) end end
function MainWindow:EnableUndo(e) self.StatusBar:EnableUndo(e) end
function MainWindow:Destroy() if self.Widget then self.Widget:Destroy() end end

return MainWindow
