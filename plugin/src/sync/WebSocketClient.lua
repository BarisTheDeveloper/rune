--[[
	Rune Studio Plugin - WebSocket Client v2
	Robust dual-transport client with consistent session ID for polling
]]

local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")

local WebSocketClient = {}
WebSocketClient.__index = WebSocketClient

-- Simple signal
local Signal = {}
Signal.__index = Signal
function Signal.new()
	local self = setmetatable({}, Signal)
	self._connections = {}
	return self
end
function Signal:Connect(fn)
	table.insert(self._connections, fn)
	return { Disconnect = function()
		for i, f in ipairs(self._connections) do if f == fn then table.remove(self._connections, i); break end end
	end }
end
function Signal:Fire(...)
	for _, fn in ipairs(self._connections) do task.spawn(fn, ...) end
end

-- Generate a random session ID
local function generateId()
	local chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	local id = "rune-"
	for _ = 1, 16 do
		id = id .. chars:sub(math.random(1, #chars), math.random(1, #chars))
	end
	return id
end

function WebSocketClient.new(host, port)
	local self = setmetatable({}, WebSocketClient)

	self.Host = host or "localhost"
	self.Port = port or 34872
	self.Connected = false
	self.Socket = nil
	self.ReconnectAttempts = 0
	self.MaxReconnectAttempts = 10
	self.ClientId = generateId()
	self.IsPolling = false

	-- Events
	self.OnConnected = Signal.new()
	self.OnDisconnected = Signal.new()
	self.OnMessageReceived = Signal.new()
	self.OnError = Signal.new()
	self.OnModeChanged = Signal.new()  -- "ws" or "polling"

	return self
end

function WebSocketClient:Connect()
	local url = string.format("ws://%s:%d", self.Host, self.Port)
	self.IsPolling = false

	if WebSocket then
		task.spawn(function()
			local ok, err = pcall(function()
				self.Socket = WebSocket.connect(url)
				if not self.Socket then
					error("WebSocket connect returned nil")
				end

				self.Socket.OnMessage:Connect(function(msg)
					self:HandleMessage(msg)
				end)
				self.Socket.OnClose:Connect(function()
					self:HandleDisconnect()
				end)

				self.Connected = true
				self.ReconnectAttempts = 0
				self.OnModeChanged:Fire("ws")
				self.OnConnected:Fire()
			end)

			if not ok then
				-- WebSocket failed, fall back to polling
				self.OnError:Fire("WebSocket unavailable, switching to HTTP polling")
				self.Socket = nil
				self:ConnectWithPolling()
			end
		end)
	else
		self:ConnectWithPolling()
	end
end

function WebSocketClient:ConnectWithPolling()
	self.IsPolling = true
	local httpPort = self.Port + 1

	task.spawn(function()
		local ok, err = pcall(function()
			local testUrl = string.format("http://%s:%d/health?clientId=%s", self.Host, httpPort, self.ClientId)
			local response = HttpService:GetAsync(testUrl, false)

			self.Connected = true
			self.ReconnectAttempts = 0
			self.OnModeChanged:Fire("polling")
			self.OnConnected:Fire()

			self:StartPolling(httpPort)
		end)

		if not ok then
			self.OnError:Fire("Connection failed: " .. tostring(err))
			self:AttemptReconnect()
		end
	end)
end

function WebSocketClient:StartPolling(httpPort)
	task.spawn(function()
		while self.Connected do
			-- Pause in Play mode (HTTP blocked in game sandbox)
			if not RunService:IsEdit() then
				task.wait(1)
				continue
			end

			local ok, result = pcall(function()
				local pollUrl = string.format("http://%s:%d/poll?clientId=%s", self.Host, httpPort, self.ClientId)
				local response = HttpService:GetAsync(pollUrl, false)

				if response and response ~= "" then
					local messages = HttpService:JSONDecode(response)
					if messages and #messages > 0 then
						for _, message in ipairs(messages) do
							self:HandleMessage(HttpService:JSONEncode(message))
						end
					end
				end
			end)

			if not ok then
				-- HTTP error in non-Edit mode or network issue, back off
				task.wait(3)
			else
				task.wait(0.5)
			end
		end
	end)
end

function WebSocketClient:Disconnect()
	self.Connected = false
	self.IsPolling = false
	if self.Socket then
		pcall(function() self.Socket:Close() end)
		self.Socket = nil
	end
	self.OnDisconnected:Fire()
end

function WebSocketClient:IsConnected()
	return self.Connected
end

function WebSocketClient:Send(message)
	if not self.Connected then
		return false
	end

	-- WebSocket path
	if self.Socket and not self.IsPolling then
		local ok, err = pcall(function()
			local json = HttpService:JSONEncode(message)
			self.Socket:Send(json)
		end)
		if not ok then
			self.OnError:Fire(tostring(err))
			return false
		end
		return true
	end

	-- HTTP polling path
	local httpPort = self.Port + 1
	local ok, err = pcall(function()
		local url = string.format("http://%s:%d/send?clientId=%s", self.Host, httpPort, self.ClientId)
		local json = HttpService:JSONEncode(message)
		HttpService:PostAsync(url, json)
	end)

	if not ok then
		self.OnError:Fire(tostring(err))
		return false
	end

	return true
end

function WebSocketClient:HandleMessage(rawMessage)
	local ok, message = pcall(function()
		return HttpService:JSONDecode(rawMessage)
	end)

	if ok and message then
		self.OnMessageReceived:Fire(message)
	end
end

function WebSocketClient:HandleDisconnect()
	self.Connected = false
	self.Socket = nil
	self.OnDisconnected:Fire()
	self:AttemptReconnect()
end

function WebSocketClient:AttemptReconnect()
	if self.ReconnectAttempts >= self.MaxReconnectAttempts then
		self.OnError:Fire("Max reconnect attempts reached")
		return
	end

	self.ReconnectAttempts = self.ReconnectAttempts + 1
	local delay = math.min(2 ^ self.ReconnectAttempts, 30)
	task.delay(delay, function()
		if not self.Connected then
			self:Connect()
		end
	end)
end

return WebSocketClient
