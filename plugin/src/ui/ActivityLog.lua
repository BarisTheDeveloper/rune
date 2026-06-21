--[[ Rune Studio Plugin - Activity Log v3 ]]
local Theme = require(script.Parent.Parent.utils.Theme)
local ActivityLog = {}; ActivityLog.__index = ActivityLog

local MAX = 500

function ActivityLog.new(parentFrame)
	local self = setmetatable({}, ActivityLog); local t = Theme
	self.Entries = {}; self.EntryFrames = {}

	self.Container = Instance.new("Frame")
	self.Container.Size = UDim2.new(1, 0, 1, 0); self.Container.BackgroundColor3 = t.Colors.Bg
	self.Container.BorderSizePixel = 0; self.Container.Parent = parentFrame

	self.Scroll = Instance.new("ScrollingFrame")
	self.Scroll.Size = UDim2.new(1, 0, 1, 0); self.Scroll.BackgroundTransparency = 1; self.Scroll.BorderSizePixel = 0
	self.Scroll.ScrollBarThickness = 4; self.Scroll.ScrollBarImageColor3 = t.Colors.BorderLight
	self.Scroll.CanvasSize = UDim2.new(0, 0, 0, 0); self.Scroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
	self.Scroll.Parent = self.Container

	self.Layout = Instance.new("UIListLayout"); self.Layout.SortOrder = Enum.SortOrder.LayoutOrder
	self.Layout.Padding = UDim.new(0, 1); self.Layout.Parent = self.Scroll
	return self
end

function ActivityLog:AddEntry(cat, msg)
	local t = Theme; local ts = os.date("%H:%M:%S")
	local color, bg, icon
	if cat == "success" then color, bg, icon = t.Colors.Success, t.Colors.SuccessBg, "✓"
	elseif cat == "error" then color, bg, icon = t.Colors.Error, t.Colors.ErrorBg, "✗"
	elseif cat == "warn" then color, bg, icon = t.Colors.Warning, t.Colors.WarningBg, "⚠"
	elseif cat == "info" then color, bg, icon = t.Colors.Info, t.Colors.InfoBg, "ℹ"
	elseif cat == "sync" then color, bg, icon = t.Colors.Accent, t.Colors.BgHover, "↻"
	else color, bg, icon = t.Colors.TextMuted, t.Colors.BgCard, "•" end

	local e = { cat = cat, msg = msg, ts = ts, icon = icon, color = color, bg = bg }
	table.insert(self.Entries, e)
	while #self.Entries > MAX do table.remove(self.Entries, 1) end

	local idx = #self.Entries
	local f = Instance.new("Frame")
	f.Size = UDim2.new(1, -6, 0, t.Sizes.LogRowH); f.Position = UDim2.new(0, 3, 0, 0)
	f.BackgroundColor3 = bg; f.BackgroundTransparency = 0.5; f.BorderSizePixel = 0
	f.LayoutOrder = idx; f.Parent = self.Scroll
	Instance.new("UICorner", f).CornerRadius = t.Radius.Xs

	local tl = Instance.new("TextLabel")
	tl.Size = UDim2.new(0, 50, 1, 0); tl.Position = UDim2.new(0, 4, 0, 0)
	tl.BackgroundTransparency = 1; tl.Text = ts; tl.TextColor3 = t.Colors.TextDim
	tl.Font = t.Fonts.Mono; tl.TextSize = t.Sizes.Tiny; tl.TextXAlignment = Enum.TextXAlignment.Right; tl.Parent = f

	local il = Instance.new("TextLabel")
	il.Size = UDim2.new(0, 14, 1, 0); il.Position = UDim2.new(0, 56, 0, 0)
	il.BackgroundTransparency = 1; il.Text = icon; il.TextColor3 = color
	il.Font = t.Fonts.Body; il.TextSize = 10; il.Parent = f

	local ml = Instance.new("TextLabel")
	ml.Size = UDim2.new(1, -76, 1, 0); ml.Position = UDim2.new(0, 72, 0, 0)
	ml.BackgroundTransparency = 1; ml.Text = msg; ml.TextColor3 = t.Colors.Text
	ml.Font = t.Fonts.Mono; ml.TextSize = t.Sizes.Tiny; ml.TextXAlignment = Enum.TextXAlignment.Left
	ml.TextTruncate = Enum.TextTruncate.AtEnd; ml.Parent = f

	self.EntryFrames[idx] = f
	self.Scroll.CanvasPosition = Vector2.new(0, 99999)
end

function ActivityLog:Clear() for _, f in pairs(self.EntryFrames) do f:Destroy() end; self.Entries = {}; self.EntryFrames = {} end
return ActivityLog
