--[[
	Rune Studio Plugin
	Modern Roblox Studio plugin for bidirectional synchronization with Rune CLI
]]

local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")
local Selection = game:GetService("Selection")
local ChangeHistoryService = game:GetService("ChangeHistoryService")

-- Plugin setup
local toolbar = plugin:CreateToolbar("Rune")
local toggleButton = toolbar:CreateButton(
	"Rune Sync",
	"Toggle Rune Sync Panel",
	"rbxassetid://6031071053"
)

-- Load modules
local Theme = require(script.Parent.utils.Theme)
local WebSocketClient = require(script.Parent.sync.WebSocketClient)
local InstanceSync = require(script.Parent.sync.InstanceSync)
local MainWindow = require(script.Parent.ui.MainWindow)

-- State
local isOpen = false
local mainWindow = nil
local wsClient = nil
local syncHandler = nil

-- Initialize plugin
local function initialize()
	mainWindow = MainWindow.new(plugin)
	mainWindow.OnConnectRequested:Connect(function(host, port)
		connectToRune(host, port)
	end)
	mainWindow.OnDisconnectRequested:Connect(function()
		disconnectFromRune()
	end)
	mainWindow.OnSyncToggle:Connect(function(enabled)
		if syncHandler then
			syncHandler:SetEnabled(enabled)
		end
	end)
end

-- Connect to Rune CLI
function connectToRune(host, port)
	if wsClient and wsClient:IsConnected() then
		wsClient:Disconnect()
	end

	wsClient = WebSocketClient.new(host, port)
	syncHandler = InstanceSync.new(wsClient, mainWindow)

	wsClient.OnConnected:Connect(function()
		mainWindow:SetStatus("Connected", Theme.Colors.Success)
		mainWindow:SetConnectionState(true)
		syncHandler:RequestSync()
	end)

	wsClient.OnDisconnected:Connect(function()
		mainWindow:SetStatus("Disconnected", Theme.Colors.Error)
		mainWindow:SetConnectionState(false)
	end)

	wsClient.OnMessageReceived:Connect(function(message)
		syncHandler:HandleMessage(message)
	end)

	wsClient.OnError:Connect(function(err)
		mainWindow:SetStatus("Error: " .. tostring(err), Theme.Colors.Error)
	end)

	mainWindow:SetStatus("Connecting...", Theme.Colors.Warning)
	wsClient:Connect()
end

-- Disconnect from Rune
function disconnectFromRune()
	if wsClient then
		wsClient:Disconnect()
		wsClient = nil
	end
	if syncHandler then
		syncHandler:Destroy()
		syncHandler = nil
	end
	mainWindow:SetStatus("Disconnected", Theme.Colors.TextMuted)
	mainWindow:SetConnectionState(false)
end

-- Toggle window
toggleButton.Click:Connect(function()
	isOpen = not isOpen
	if isOpen then
		if not mainWindow then
			initialize()
		end
		mainWindow:Show()
	else
		if mainWindow then
			mainWindow:Hide()
		end
	end
	toggleButton:SetActive(isOpen)
end)

-- Cleanup on plugin unload
plugin.Unloading:Connect(function()
	disconnectFromRune()
	if mainWindow then
		mainWindow:Destroy()
	end
end)

-- Auto-open if previously open
if plugin:GetSetting("Rune_IsOpen") then
	isOpen = true
	initialize()
	mainWindow:Show()
	toggleButton:SetActive(true)
end

print("[Rune] Studio plugin loaded")