-- Player HUD
local player = game.Players.LocalPlayer
local gui = player:WaitForChild('PlayerGui')
local frame = Instance.new('Frame')
frame.Size = UDim2.new(1,0,0,40)
frame.Parent = gui