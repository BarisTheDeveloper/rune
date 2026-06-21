-- Handles player join/leave
local Players = game:GetService('Players')
Players.PlayerAdded:Connect(function(p)
	print('[Rune] Player joined: ' .. p.Name)
end)