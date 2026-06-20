--[[
	Rune Studio Plugin - Status Bar
	Bottom status bar showing connection and sync state
]]

local Theme = require(script.Parent.Parent.utils.Theme)

local StatusBar = {}
StatusBar.__index = StatusBar

function StatusBar.new(parentFrame)
	local self = setmetatable({}, StatusBar)

	self.ParentFrame = parentFrame
	self:BuildUI()

	return self
end

function StatusBar:BuildUI()
	local theme = Theme

	-- Status bar frame
	self.Frame = Instance.new("Frame")
	self.Frame.Name = "StatusBar"
	self.Frame.Size = UDim2.new(1, -20, 0, 24)
	self.Frame.Position = UDim2.new(0, 10, 1, -34)
	self.Frame.BackgroundColor3 = theme.Colors.BackgroundLight
	self.Frame.BorderSizePixel = 0
	self.Frame.Parent = self.ParentFrame

	local corner = Instance.new("UICorner")
	corner.CornerRadius = theme.CornerRadius
	corner.Parent = self.Frame

	-- Status indicator dot
	self.Indicator = Instance.new("Frame")
	self.Indicator.Name = "Indicator"
	self.Indicator.Size = UDim2.new(0, 8, 0, 8)
	self.Indicator.Position = UDim2.new(0, 8, 0.5, -4)
	self.Indicator.BackgroundColor3 = theme.Colors.TextMuted
	self.Indicator.BorderSizePixel = 0
	self.Indicator.Parent = self.Frame

	local indicatorCorner = Instance.new("UICorner")
	indicatorCorner.CornerRadius = UDim.new(1, 0)
	indicatorCorner.Parent = self.Indicator

	-- Status text
	self.TextLabel = Instance.new("TextLabel")
	self.TextLabel.Name = "StatusText"
	self.TextLabel.Size = UDim2.new(1, -24, 1, 0)
	self.TextLabel.Position = UDim2.new(0, 22, 0, 0)
	self.TextLabel.BackgroundTransparency = 1
	self.TextLabel.Text = "Ready"
	self.TextLabel.TextColor3 = theme.Colors.TextMuted
	self.TextLabel.Font = theme.Fonts.Body
	self.TextLabel.TextSize = theme.Sizes.Small
	self.TextLabel.TextXAlignment = Enum.TextXAlignment.Left
	self.TextLabel.TextTruncate = Enum.TextTruncate.AtEnd
	self.TextLabel.Parent = self.Frame
end

function StatusBar:SetStatus(text, color)
	self.TextLabel.Text = text
	if color then
		self.Indicator.BackgroundColor3 = color
		self.TextLabel.TextColor3 = color
	else
		self.Indicator.BackgroundColor3 = Theme.Colors.TextMuted
		self.TextLabel.TextColor3 = Theme.Colors.TextMuted
	end
end

return StatusBar