import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent } from "../components/Card";
import Button from "../components/Button";
import { 
  DoorOpen, 
  Lightbulb, 
  Fan, 
  Search, 
  X, 
  LayoutGrid, 
  List, 
  Plus, 
  Wifi, 
  Thermometer, 
  Lock, 
  ChevronDown,
  Tv,
  Speaker,
  Smartphone
} from "lucide-react";
import { Loading } from "../components/Loading";

const Rooms = () => {
  const backendUrl = "/rooms.json";
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([
    { id: 1, name: "Smart Light", type: "light", icon: <Lightbulb size={24} /> },
    { id: 2, name: "Smart TV", type: "tv", icon: <Tv size={24} /> },
    { id: 3, name: "Smart Speaker", type: "speaker", icon: <Speaker size={24} /> },
    { id: 4, name: "Smart Lock", type: "lock", icon: <Lock size={24} /> },
    { id: 5, name: "Smart Thermostat", type: "thermostat", icon: <Thermometer size={24} /> },
    { id: 6, name: "Smart Fan", type: "fan", icon: <Fan size={24} /> },
  ]);
  const [selectedDevices, setSelectedDevices] = useState([]);

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      try {
        const response = await axios.get(backendUrl);
        // Add device status to each room (lights, temperature, etc.)
        const roomsWithDevices = response.data.map(room => ({
          ...room,
          devices: {
            lights: Math.random() > 0.5,
            temperature: (Math.floor(Math.random() * 10) + 18).toFixed(1), // Random temp between 18-28°C
            blinds: Math.random() > 0.5 ? "open" : "closed",
            connected_devices: Math.floor(Math.random() * 5)
          }
        }));
        setRooms(roomsWithDevices);
        setFilteredRooms(roomsWithDevices);
      } catch (err) {
        console.error("Error fetching rooms:", err);
        setError("Failed to load rooms. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  const handleRoomSelection = (room) => {
    setSelectedRoom(room);
    setIsModalOpen(true);
    // Reset selected devices
    setSelectedDevices([]);
  };

  // Search functionality
  useEffect(() => {
    const filtered = rooms.filter((room) =>
      room.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRooms(filtered);
  }, [searchTerm, rooms]);

  // Toggle device status
  const toggleDevice = (deviceType) => {
    if (selectedRoom) {
      const updatedRooms = rooms.map(room => {
        if (room.id === selectedRoom.id) {
          const updatedRoom = { 
            ...room, 
            devices: { 
              ...room.devices,
              [deviceType]: deviceType === 'blinds' 
                ? room.devices.blinds === "open" ? "closed" : "open"
                : !room.devices[deviceType]
            } 
          };
          setSelectedRoom(updatedRoom);
          return updatedRoom;
        }
        return room;
      });
      
      setRooms(updatedRooms);
      setFilteredRooms(
        updatedRooms.filter((room) =>
          room.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  };

  const getRoomIcon = (type) => {
    switch(type) {
      case "Living Room":
        return <DoorOpen size={40} className="text-purple-700" />;
      case "Bedroom":
        return <Lightbulb size={40} className="text-purple-700" />;
      case "Kitchen":
        return <Fan size={40} className="text-purple-700" />;
      default:
        return <DoorOpen size={40} className="text-purple-700" />;
    }
  };

  const toggleDeviceSelection = (device) => {
    if (selectedDevices.some(d => d.id === device.id)) {
      setSelectedDevices(selectedDevices.filter(d => d.id !== device.id));
    } else {
      setSelectedDevices([...selectedDevices, device]);
    }
  };

  const addDevicesToRoom = () => {
    if (selectedRoom && selectedDevices.length > 0) {
      const updatedRooms = rooms.map(room => {
        if (room.id === selectedRoom.id) {
          const updatedRoom = {
            ...room,
            devices: {
              ...room.devices,
              connected_devices: room.devices.connected_devices + selectedDevices.length,
              added_devices: [...(room.devices.added_devices || []), ...selectedDevices]
            }
          };
          setSelectedRoom(updatedRoom);
          return updatedRoom;
        }
        return room;
      });
      
      setRooms(updatedRooms);
      setFilteredRooms(
        updatedRooms.filter((room) =>
          room.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setSelectedDevices([]);
      setIsModalOpen(false);
    }
  };

  // Modal component
  const Modal = () => {
    if (!isModalOpen) return null;
    
    return (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsModalOpen(false)}
        ></div>
        
        {/* Modal */}
        <div className="fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300 ease-in-out">
          <div className="bg-white rounded-t-2xl shadow-xl max-h-[80vh] overflow-y-auto">
            {/* Handle */}
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>
            
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-full mr-3">
                    {getRoomIcon(selectedRoom?.type)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-purple-900">{selectedRoom?.name}</h2>
                    <p className="text-gray-500">{selectedRoom?.type}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <X size={24} className="text-gray-500" />
                </button>
              </div>
            </div>
            
            {/* Room Stats */}
            <div className="px-4 py-3 bg-gray-50">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Temperature</p>
                  <p className="text-lg font-bold text-purple-700">{selectedRoom?.devices?.temperature}°C</p>
                  <p className="text-xs text-gray-500">Auto</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Devices</p>
                  <p className="text-lg font-bold text-purple-700">{selectedRoom?.devices?.connected_devices}</p>
                  <p className="text-xs text-gray-500">Connected</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-lg font-bold text-green-600">Online</p>
                  <p className="text-xs text-gray-500"><Wifi size={12} className="inline mr-1" />Connected</p>
                </div>
              </div>
            </div>
            
            {/* Add Devices Section */}
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-3 text-purple-900">Add Devices to Room</h3>
              <p className="text-sm text-gray-500 mb-4">
                Select devices to add to this room. Smart temperature control is automatic.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                {availableDevices.map(device => (
                  <div 
                    key={device.id}
                    onClick={() => toggleDeviceSelection(device)}
                    className={`p-4 border rounded-lg flex items-center cursor-pointer transition-colors ${
                      selectedDevices.some(d => d.id === device.id) 
                        ? "bg-purple-100 border-purple-500" 
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className={`p-2 rounded-full mr-3 ${
                      selectedDevices.some(d => d.id === device.id) 
                        ? "bg-purple-200" 
                        : "bg-gray-100"
                    }`}>
                      {device.icon}
                    </div>
                    <div>
                      <p className="font-medium">{device.name}</p>
                      <p className="text-xs text-gray-500">Tap to select</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Connected Devices Section */}
            {selectedRoom?.devices?.added_devices && selectedRoom.devices.added_devices.length > 0 && (
              <div className="p-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold mb-3 text-purple-900">Connected Devices</h3>
                <div className="space-y-2">
                  {selectedRoom.devices.added_devices.map((device, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-full mr-3">
                          {device.icon}
                        </div>
                        <span>{device.name}</span>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Connected</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Room Automation */}
            <div className="p-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold mb-2 text-purple-900">Room Automation</h3>
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Thermometer size={20} className="text-purple-700 mr-2" />
                    <div>
                      <p className="font-medium">Smart Temperature</p>
                      <p className="text-xs text-gray-500">Auto-adjusts based on time and occupancy</p>
                    </div>
                  </div>
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      id="temp-toggle"
                      defaultChecked
                    />
                    <label 
                      htmlFor="temp-toggle" 
                      className="block w-12 h-6 bg-purple-600 rounded-full cursor-pointer"
                    >
                      <span className="block w-4 h-4 mt-1 ml-1 bg-white rounded-full transition-transform duration-300 transform"></span>
                    </label>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Lightbulb size={20} className="text-purple-700 mr-2" />
                    <div>
                      <p className="font-medium">Auto Lighting</p>
                      <p className="text-xs text-gray-500">Adjusts lighting based on natural light</p>
                    </div>
                  </div>
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      id="light-toggle"
                    />
                    <label 
                      htmlFor="light-toggle" 
                      className="block w-12 h-6 bg-gray-300 rounded-full cursor-pointer"
                    >
                      <span className="block w-4 h-4 mt-1 ml-1 bg-white rounded-full transition-transform duration-300"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Smart Scenes */}
            <div className="p-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold mb-3 text-purple-900">Smart Scenes</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-center">
                  <div className="mx-auto w-10 h-10 flex items-center justify-center bg-blue-100 rounded-full mb-2">
                    <Tv size={20} className="text-blue-700" />
                  </div>
                  <p className="font-medium text-blue-800">Movie Night</p>
                </div>
                
                <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg text-center">
                  <div className="mx-auto w-10 h-10 flex items-center justify-center bg-purple-100 rounded-full mb-2">
                    <Smartphone size={20} className="text-purple-700" />
                  </div>
                  <p className="font-medium text-purple-800">Work Mode</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-gray-200">
              <Button 
                onClick={addDevicesToRoom}
                disabled={selectedDevices.length === 0}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg mb-3"
              >
                Add {selectedDevices.length} {selectedDevices.length === 1 ? 'Device' : 'Devices'} to Room
              </Button>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-full py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-purple-900">My Rooms</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-md ${
              viewMode === "grid" ? "bg-purple-100 text-purple-700" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <LayoutGrid size={20} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-md ${
              viewMode === "list" ? "bg-purple-100 text-purple-700" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={20} className="text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search rooms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
        />
        {searchTerm && (
          <button
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setSearchTerm("")}
          >
            <X size={20} className="text-gray-400" />
          </button>
        )}
      </div>

      {/* Room Display */}
      {filteredRooms.length === 0 ? (
        <div className="text-center py-10">
          <div className="mb-4 inline-block p-4 bg-gray-100 rounded-full">
            <Search size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700">No rooms found</h3>
          <p className="text-gray-500">Try adjusting your search or add a new room</p>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
          {filteredRooms.map((room) => (
            <Card
              key={room.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                viewMode === "list" ? "flex items-center justify-between" : ""
              }`}
              onClick={() => handleRoomSelection(room)}
            >
              <CardContent className={viewMode === "list" ? "flex items-center justify-between w-full" : ""}>
                <div className={`flex items-center ${viewMode === "grid" ? "mb-4" : ""}`}>
                  <div className="p-3 bg-purple-100 rounded-full mr-4">
                    {getRoomIcon(room.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-purple-900">{room.name}</h3>
                    <p className="text-gray-500">{room.type}</p>
                  </div>
                </div>
                {viewMode === "grid" && (
                  <div className="mt-2 py-3 border-t border-gray-100">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center">
                        <Lightbulb
                          size={18}
                          className={room.devices.lights ? "text-yellow-500" : "text-gray-400"}
                        />
                        <span className="ml-1 text-gray-600">
                          {room.devices.lights ? "On" : "Off"}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Thermometer size={18} className="text-red-500" />
                        <span className="ml-1 text-gray-600">{room.devices.temperature}°C</span>
                      </div>
                      <div className="flex items-center">
                        <Wifi size={18} className="text-blue-500" />
                        <span className="ml-1 text-gray-600">{room.devices.connected_devices} devices</span>
                      </div>
                    </div>
                  </div>
                )}
                {viewMode === "list" && (
                  <div className="flex space-x-4 items-center">
                    <div className="flex items-center">
                      <Lightbulb
                        size={18}
                        className={room.devices.lights ? "text-yellow-500" : "text-gray-400"}
                      />
                      <span className="ml-1 text-gray-600">
                        {room.devices.lights ? "On" : "Off"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Thermometer size={18} className="text-red-500" />
                      <span className="ml-1 text-gray-600">{room.devices.temperature}°C</span>
                    </div>
                    <ChevronDown size={20} className="text-gray-400" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Room Button */}
      <div className="fixed bottom-6 right-6">
        <button
          className="bg-purple-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Room Detail Modal */}
      {selectedRoom && <Modal />}
    </div>
  );
};

export default Rooms;