--[[
	Rune Studio Plugin - Theme
	Modern dark theme inspired by VS Code
]]

local Theme = {}

Theme.Colors = {
	Background = Color3.fromRGB(30, 30, 30),
	BackgroundLight = Color3.fromRGB(37, 37, 38),
	BackgroundLighter = Color3.fromRGB(45, 45, 48),
	Surface = Color3.fromRGB(51, 51, 51),
	Border = Color3.fromRGB(65, 65, 65),
	Accent = Color3.fromRGB(0, 122, 204),
	AccentHover = Color3.fromRGB(0, 140, 230),
	Success = Color3.fromRGB(75, 183, 75),
	Warning = Color3.fromRGB(220, 180, 60),
	Error = Color3.fromRGB(240, 80, 80),
	Text = Color3.fromRGB(240, 240, 240),
	TextMuted = Color3.fromRGB(150, 150, 150),
	TextDark = Color3.fromRGB(100, 100, 100),
	Folder = Color3.fromRGB(200, 180, 100),
	FileLua = Color3.fromRGB(100, 180, 220),
	FileModel = Color3.fromRGB(180, 140, 220),
	FileJson = Color3.fromRGB(180, 180, 180),
}

Theme.Fonts = {
	Header = Enum.Font.GothamBold,
	Body = Enum.Font.Gotham,
	Mono = Enum.Font.Code,
}

Theme.Sizes = {
	Header = 18,
	Body = 14,
	Small = 12,
	ButtonHeight = 32,
	InputHeight = 28,
	TreeIndent = 20,
	RowHeight = 24,
}

Theme.CornerRadius = UDim.new(0, 4)

return Theme