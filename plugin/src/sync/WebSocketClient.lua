--[[
	Rune Studio Plugin - WebSocket Client
	Handles WebSocket connection to Rune CLI server
]]

local HttpService = game:GetService("HttpService")

local WebSocketClient = {}
WebSocketClient.__index = WebSocketClient

-- Simple signal implementation
local Signal = {}
Signal.__index = Signal

function Signal.new()
	local self = setmetatable({}, Signal)
	self._connections = {}
	return self
end

function Signal:Connect(callback)
	table.insert(self._connections, callback)
	return {
		Disconnect = function()
			for i, conn in ipairs(self._connections) do
				if conn == callback then
					table.remove(self._connections, i)
					break
				end
			end
		end
	}
end

function Signal:Fire(...)
	for _, callback in ipairs(self._connections) do
		task.spawn(callback, ...)
	end
end

function WebSocketClient.new(host, port)
	local self = setmetatable({}, WebSocketClient)

	self.Host = host or "localhost"
	self.Port = port or 34872
	self.Connected = false
	self.Socket = nil
	self.ReconnectAttempts = 0
	self.MaxReconnectAttempts = 5

	-- Events
	self.OnConnected = Signal.new()
	self.OnDisconnected = Signal.new()
	self.OnMessageReceived = Signal.new()
	self.OnError = Signal.new()

	return self
end

function WebSocketClient:Connect()
	-- Check if WebSocket API is available
	if not WebSocket then
		self.OnError:Fire("WebSocket API not available in this Roblox version. Please update Roblox Studio to the latest version.")
		return
	end

	local url = string.format("ws://%s:%d", self.Host, self.Port)

	task.spawn(function()
		local success, result = pcall(function()
			-- Roblox WebSocket API
			self.Socket = WebSocket.connect(url)

			if not self.Socket then
				error("Failed to create WebSocket connection")
			end

			self.Socket.OnMessage:Connect(function(message)
				self:HandleMessage(message)
			end)

			self.Socket.OnClose:Connect(function()
				self:HandleDisconnect()
			end)

			self.Connected = true
			self.ReconnectAttempts = 0
			self.OnConnected:Fire()
		end)

		if not success then
			self.OnError:Fire(tostring(result))
			self:AttemptReconnect()
		end
	end)
end

function WebSocketClient:Disconnect()
	self.Connected = false
	if self.Socket then
		pcall(function()
			self.Socket:Close()
		end)
		self.Socket = nil
	end
	self.OnDisconnected:Fire()
end

function WebSocketClient:IsConnected()
	return self.Connected and self.Socket ~= nil
end

function WebSocketClient:Send(message)
	if not self:IsConnected() then
		warn("[Rune] Cannot send message: not connected")
		return false
	end

	local success, result = pcall(function()
		local json = HttpService:JSONEncode(message)
		self.Socket:Send(json)
	end)

	if not success then
		self.OnError:Fire(result)
		return false
	end

	return true
end

function WebSocketClient:HandleMessage(rawMessage)
	local success, message = pcall(function()
		return HttpService:JSONDecode(rawMessage)
	end)

	if success and message then
		self.OnMessageReceived:Fire(message)
	else
		self.OnError:Fire("Failed to parse message: " .. tostring(rawMessage))
	end
end

function WebSocketClient:HandleDisconnect()
	self.Connected = false
	self.Socket = nil
	self.OnDisconnected:Fire()

	-- Attempt reconnection
	self:AttemptReconnect()
end

function WebSocketClient:AttemptReconnect()
	if self.ReconnectAttempts >= self.MaxReconnectAttempts then
		self.OnError:Fire("Max reconnection attempts reached")
		return
	end

	self.ReconnectAttempts = self.ReconnectAttempts + 1
	task.delay(2 ^ self.ReconnectAttempts, function()
		if not self.Connected then
			self:Connect()
		end
	end)
end

return WebSocketClient