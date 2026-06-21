--[[
	Rune Studio Plugin v3 — Minimal + Toast Notifications
]]

local RunService = game:GetService("RunService")

-- Plugin setup
local toolbar = plugin:CreateToolbar("Rune")
local toggleButton = toolbar:CreateButton("◆ RUNE", "Toggle Rune Panel", "rbxassetid://6031071053")

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

local function log(cat, msg)
	if mainWindow then mainWindow:LogActivity(cat, msg) end
	print("[Rune] " .. msg)
end

-- Initialize
local function initialize()
	mainWindow = MainWindow.new(plugin)
	log("info", "◆ RUNE v3 loaded")

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
			local ok = syncHandler:UndoLastChange()
			if ok then
				mainWindow:SetStatus("Undo", Theme.Colors.Warning)
				mainWindow:ShowToast("↩", "Last change undone", Theme.Colors.Warning, 2)
			end
		end
	end)
end

function connectToRune(host, port)
	disconnectFromRune()

	mainWindow:SetStatus("Connecting...", Theme.Colors.Warning)
	log("sync", "Connecting to " .. host .. ":" .. port)

	wsClient = WebSocketClient.new(host, port)
	syncHandler = InstanceSync.new(wsClient, mainWindow)

	wsClient.OnModeChanged:Connect(function(mode)
		local label = mode == "ws" and "WebSocket" or "HTTP Polling"
		log("info", "Transport: " .. label)
	end)

	wsClient.OnConnected:Connect(function()
		mainWindow:SetStatus("Connected", Theme.Colors.Success)
		mainWindow:SetConnectionState(true)
		local mode = wsClient.IsPolling and "HTTP" or "WS"
		log("success", "Connected via " .. mode)
		mainWindow:ShowToast("✓", "Connected to " .. host .. ":" .. port, Theme.Colors.Success, 3)
		syncHandler:RequestSync()
	end)

	wsClient.OnDisconnected:Connect(function()
		mainWindow:SetStatus("Disconnected", Theme.Colors.Error)
		mainWindow:SetConnectionState(false)
		log("warn", "Disconnected")
		mainWindow:ShowToast("✗", "Disconnected from server", Theme.Colors.Error, 3)
	end)

	wsClient.OnMessageReceived:Connect(function(message)
		syncHandler:HandleMessage(message)
	end)

	wsClient.OnError:Connect(function(err)
		local msg = tostring(err)
		mainWindow:SetStatus("Error", Theme.Colors.Error)
		log("error", msg)
		mainWindow:ShowToast("⚠", msg, Theme.Colors.Warning, 4)
	end)

	wsClient:Connect()
end

function disconnectFromRune()
	if wsClient then wsClient:Disconnect(); wsClient = nil; log("info", "Disconnected") end
	if syncHandler then syncHandler:Destroy(); syncHandler = nil end
	if mainWindow then
		mainWindow:SetStatus("Disconnected", Theme.Colors.TextMuted)
		mainWindow:SetConnectionState(false)
		mainWindow:SetInstanceCount(0)
		mainWindow:EnableUndo(false)
	end
end

-- InstanceSync toast hooks
local origFullSync = InstanceSync.HandleFullSync
InstanceSync.HandleFullSync = function(self, data)
	origFullSync(self, data)
	if mainWindow then
		local count = data and data.count or 0
		mainWindow:ShowToast("✓", "Synced " .. count .. " instances", Theme.Colors.Success, 3)
	end
end

local origCreated = InstanceSync.HandleInstanceCreated
InstanceSync.HandleInstanceCreated = function(self, data)
	origCreated(self, data)
	if mainWindow then
		mainWindow:ShowToast("+", data and data.name or "Created", Theme.Colors.Success, 2)
	end
end

local origDeleted = InstanceSync.HandleInstanceDeleted
InstanceSync.HandleInstanceDeleted = function(self, data)
	origDeleted(self, data)
	if mainWindow then
		mainWindow:ShowToast("−", data and data.name or "Deleted", Theme.Colors.Warning, 2)
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

print("[Rune] ◆ RUNE v3 ready")
