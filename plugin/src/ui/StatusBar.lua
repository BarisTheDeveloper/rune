--[[ Rune Studio Plugin - Modern Status Bar v3 ]]
local Theme = require(script.Parent.Parent.utils.Theme)
local StatusBar = {}; StatusBar.__index = StatusBar

function StatusBar.new(parentFrame)
	local self = setmetatable({}, StatusBar); local t = Theme
	self.ParentFrame = parentFrame; self.Connected = false; self.ICount = 0

	self.Frame = Instance.new("Frame")
	self.Frame.Size = UDim2.new(1, 0, 0, t.Sizes.StatusBarH)
	self.Frame.Position = UDim2.new(0, 0, 1, -t.Sizes.StatusBarH)
	self.Frame.BackgroundColor3 = t.Colors.BgCard
	self.Frame.BorderSizePixel = 0; self.Frame.Parent = parentFrame

	local line = Instance.new("Frame")
	line.Size = UDim2.new(1, 0, 0, 1); line.BackgroundColor3 = t.Colors.Border
	line.BorderSizePixel = 0; line.Parent = self.Frame

	self.Indicator = Instance.new("Frame")
	self.Indicator.Size = UDim2.new(0, 7, 0, 7); self.Indicator.Position = UDim2.new(0, 10, 0.5, -3)
	self.Indicator.BackgroundColor3 = t.Colors.TextDim; self.Indicator.BorderSizePixel = 0; self.Indicator.Parent = self.Frame
	Instance.new("UICorner", self.Indicator).CornerRadius = UDim.new(1, 0)

	self.StatusLabel = Instance.new("TextLabel")
	self.StatusLabel.Size = UDim2.new(0.5, -20, 1, 0); self.StatusLabel.Position = UDim2.new(0, 22, 0, 0)
	self.StatusLabel.BackgroundTransparency = 1; self.StatusLabel.Text = "Ready"
	self.StatusLabel.TextColor3 = t.Colors.TextMuted; self.StatusLabel.Font = t.Fonts.Body
	self.StatusLabel.TextSize = t.Sizes.Small; self.StatusLabel.TextXAlignment = Enum.TextXAlignment.Left
	self.StatusLabel.Parent = self.Frame

	self.CountLabel = Instance.new("TextLabel")
	self.CountLabel.Size = UDim2.new(0, 100, 1, 0); self.CountLabel.Position = UDim2.new(1, -106, 0, 0)
	self.CountLabel.BackgroundTransparency = 1; self.CountLabel.Text = ""
	self.CountLabel.TextColor3 = t.Colors.TextDim; self.CountLabel.Font = t.Fonts.Mono
	self.CountLabel.TextSize = t.Sizes.Small; self.CountLabel.TextXAlignment = Enum.TextXAlignment.Right
	self.CountLabel.Parent = self.Frame

	self.UndoBtn = Instance.new("TextButton")
	self.UndoBtn.Size = UDim2.new(0, 44, 0, t.Sizes.StatusBarH - 4); self.UndoBtn.Position = UDim2.new(1, -46, 0, 2)
	self.UndoBtn.BackgroundColor3 = t.Colors.BgInput; self.UndoBtn.BorderSizePixel = 1; self.UndoBtn.BorderColor3 = t.Colors.Border
	self.UndoBtn.Text = "↩"; self.UndoBtn.TextColor3 = t.Colors.TextDim; self.UndoBtn.Font = t.Fonts.Body
	self.UndoBtn.TextSize = t.Sizes.Small; self.UndoBtn.AutoButtonColor = false; self.UndoBtn.Parent = self.Frame
	Instance.new("UICorner", self.UndoBtn).CornerRadius = t.Radius.Xs

	self.UndoBtn.MouseEnter:Connect(function() self.UndoBtn.BackgroundColor3 = t.Colors.BgHover; self.UndoBtn.TextColor3 = t.Colors.Warning end)
	self.UndoBtn.MouseLeave:Connect(function() self.UndoBtn.BackgroundColor3 = t.Colors.BgInput; self.UndoBtn.TextColor3 = t.Colors.TextDim end)
	return self
end

function StatusBar:SetConnectionState(c)
	self.Connected = c
	self.Indicator.BackgroundColor3 = c and Theme.Colors.Success or Theme.Colors.TextDim
end

function StatusBar:SetStatus(t, c)
	self.StatusLabel.Text = t
	self.StatusLabel.TextColor3 = c or Theme.Colors.TextMuted
end

function StatusBar:SetInstanceCount(n)
	self.ICount = n
	self.CountLabel.Text = n > 0 and (n .. " instance" .. (n ~= 1 and "s" or "")) or ""
end

function StatusBar:OnUndo(fn) self.UndoBtn.MouseButton1Click:Connect(fn) end
function StatusBar:EnableUndo(e) self.UndoBtn.Visible = e end
return StatusBar
