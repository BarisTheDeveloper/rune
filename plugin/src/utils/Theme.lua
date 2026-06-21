--[[
	Rune Studio Plugin - Modern Theme v3
	Refined dark theme with card design and subtle gradients
]]

local Theme = {}

-- Refined palette: deeper blacks, softer accents
Theme.Colors = {
	-- Layers
	Bg = Color3.fromRGB(22, 22, 24),
	BgCard = Color3.fromRGB(30, 30, 34),
	BgHover = Color3.fromRGB(38, 38, 44),
	BgInput = Color3.fromRGB(42, 42, 48),
	BgHeader = Color3.fromRGB(28, 28, 32),

	-- Borders
	Border = Color3.fromRGB(50, 50, 56),
	BorderLight = Color3.fromRGB(62, 62, 68),

	-- Accent
	Accent = Color3.fromRGB(0, 120, 212),
	AccentHover = Color3.fromRGB(0, 136, 228),
	AccentMuted = Color3.fromRGB(10, 60, 120),

	-- Semantic
	Success = Color3.fromRGB(64, 200, 64),
	SuccessBg = Color3.fromRGB(30, 70, 40),
	Warning = Color3.fromRGB(220, 180, 60),
	WarningBg = Color3.fromRGB(70, 60, 30),
	Error = Color3.fromRGB(240, 72, 72),
	ErrorBg = Color3.fromRGB(75, 35, 35),
	Info = Color3.fromRGB(80, 170, 240),
	InfoBg = Color3.fromRGB(35, 50, 70),

	-- Text
	Text = Color3.fromRGB(212, 212, 216),
	TextBright = Color3.fromRGB(248, 248, 252),
	TextMuted = Color3.fromRGB(136, 136, 144),
	TextDim = Color3.fromRGB(96, 96, 104),

	-- File type colors
	Folder = Color3.fromRGB(220, 200, 120),
	Script = Color3.fromRGB(100, 200, 110),
	LocalScript = Color3.fromRGB(100, 175, 210),
	ModuleScript = Color3.fromRGB(180, 140, 220),
}

Theme.Fonts = {
	Title = Enum.Font.GothamBold,
	Header = Enum.Font.GothamSemibold,
	Body = Enum.Font.Gotham,
	Mono = Enum.Font.Code,
	Tiny = Enum.Font.Gotham,
}

Theme.Sizes = {
	PanelW = 320,
	Title = 18,
	Body = 13,
	Small = 11,
	Tiny = 10,
	ButtonH = 28,
	InputH = 26,
	TabH = 34,
	TreeRowH = 26,
	LogRowH = 20,
	IndentW = 16,
	IconW = 16,
	StatusBarH = 28,
	ConnBarH = 36,
	SearchH = 24,
}

Theme.Radius = {
	Lg = UDim.new(0, 8),
	Md = UDim.new(0, 6),
	Sm = UDim.new(0, 4),
	Xs = UDim.new(0, 2),
}

return Theme
