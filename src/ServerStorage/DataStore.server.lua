-- Data store module
local DataStore = {}
DataStore.Cache = {}
function DataStore:Get(key)
	return self.Cache[key]
end
return DataStore