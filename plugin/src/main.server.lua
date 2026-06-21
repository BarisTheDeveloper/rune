--[[
	Rune Studio Plugin v2.1
	Modern Roblox Studio plugin — VS Code UI, activity log, undo, dual transport
]]

local HttpService = game:GetService("HttpService")

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

local function log(category, msg)
	if mainWindow then mainWindow:LogActivity(category, msg) end
	print("[Rune] " .. msg)
end

-- Initialize
local function initialize()
	mainWindow = MainWindow.new(plugin)
	log("info", "Plugin v2.1 initialized")

	mainWindow.OnConnectRequested:Connect(function(host, port)
		connectToRune(host, port)
	end)

	mainWindow.OnDisconnectRequested:Connect(function()
		disconnectFromRune()
	end)

	mainWindow.OnSyncToggle:Connect(function(enabled)
		if syncHandler then
			syncHandler:SetEnabled(enabled)
			log("info", enabled and "Sync resumed" or "Sync paused")
		end
	end)

	mainWindow.OnUndoRequested:Connect(function()
		if syncHandler then
			local undone = syncHandler:UndoLastChange()
			if undone then
				mainWindow:SetStatus("Last change undone", Theme.Colors.Warning)
				log("sync", "Undo: last change reverted")
			else
				mainWindow:SetStatus("Nothing to undo", Theme.Colors.TextMuted)
			end
		end
	end)
end

-- Connect
function connectToRune(host, port)
	disconnectFromRune()

	mainWindow:SetStatus("Connecting...", Theme.Colors.Warning)
	log("sync", "Connecting to " .. host .. ":" .. port)

	wsClient = WebSocketClient.new(host, port)
	syncHandler = InstanceSync.new(wsClient, mainWindow)

	wsClient.OnModeChanged:Connect(function(mode)
		if mode == "ws" then
			log("success", "Transport: WebSocket")
		else
			log("info", "Transport: HTTP polling (fallback)")
		end
	end)

	wsClient.OnConnected:Connect(function()
		mainWindow:SetStatus("Connected", Theme.Colors.Success)
		mainWindow:SetConnectionState(true)
		local mode = wsClient.IsPolling and "HTTP" or "WS"
		log("success", "Connected via " .. mode .. " | " .. host .. ":" .. port)
		syncHandler:RequestSync()
	end)

	wsClient.OnDisconnected:Connect(function()
		mainWindow:SetStatus("Disconnected", Theme.Colors.Error)
		mainWindow:SetConnectionState(false)
		log("warn", "Disconnected from server")
	end)

	wsClient.OnMessageReceived:Connect(function(message)
		syncHandler:HandleMessage(message)
	end)

	wsClient.OnError:Connect(function(err)
		local msg = tostring(err)
		mainWindow:SetStatus("Error: " .. msg, Theme.Colors.Error)
		log("error", msg)
	end)

	wsClient:Connect()
end

-- Disconnect
function disconnectFromRune()
	if wsClient then
		wsClient:Disconnect()
		wsClient = nil
		log("info", "Disconnected manually")
	end
	if syncHandler then
		syncHandler:Destroy()
		syncHandler = nil
	end
	if mainWindow then
		mainWindow:SetStatus("Disconnected", Theme.Colors.TextMuted)
		mainWindow:SetConnectionState(false)
		mainWindow:SetInstanceCount(0)
		mainWindow:EnableUndo(false)
	end
end

-- Toggle
toggleButton.Click:Connect(function()
	isOpen = not isOpen
	if isOpen then
		if not mainWindow then initialize() end
		mainWindow:Show()
	else
		if mainWindow then mainWindow:Hide() end
	end
	toggleButton:SetActive(isOpen)
end)

-- Cleanup
plugin.Unloading:Connect(function()
	disconnectFromRune()
	if mainWindow then mainWindow:Destroy() end
end)

-- Auto-open
if plugin:GetSetting("Rune_IsOpen") == "true" then
	isOpen = true
	initialize()
	mainWindow:Show()
	toggleButton:SetActive(true)
end

print("[Rune] Studio plugin v2.1 ready")
