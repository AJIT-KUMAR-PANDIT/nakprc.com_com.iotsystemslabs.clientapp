import {
  Plus,
  Tv,
  Lightbulb,
  Fan,
  Coffee,
  Moon,
  Sun,
  Thermometer,
  Music,
  Lock,
  Bell,
} from "lucide-react";
import { CardSwitch } from "../components/CardSwitch";
import { Loading } from "../components/Loading";
import { useEffect, useState } from "react";
import axios from "axios";

function Home(props) {
  const [loading, setLoading] = useState(true);
  const [devicesTopData, setDevicesTopData] = useState([]);
  const [devicesScenesData, setDevicesScenesData] = useState([]);
  const [devicesFrequentlyData, setDevicesFrequentlyData] = useState([]);
  const [currentRoom, setCurrentRoom] = useState("All");
  const [error, setError] = useState(null);
  const [weatherData, setWeatherData] = useState({
    temp: "24°C",
    condition: "Sunny",
  });

  // Get dark mode state from parent component via props
  const { isBlackBg, toggleBackground } = props;

  // Backend URL
  const backendUrl = "/api.json";

  useEffect(() => {
    async function fetchData() {
      setLoading(true); // Show loading spinner
      try {
        const [topResponse, scenesResponse, frequentResponse] =
          await Promise.all([
            axios.get(`${backendUrl}`),
            axios.get(`${backendUrl}`),
            axios.get(`${backendUrl}`),
          ]);

        setDevicesTopData(
          Array.isArray(topResponse.data) ? topResponse.data : []
        );
        setDevicesScenesData(
          Array.isArray(scenesResponse.data) ? scenesResponse.data : []
        );
        setDevicesFrequentlyData(
          Array.isArray(frequentResponse.data) ? frequentResponse.data : []
        );
      } catch (err) {
        console.error("API Error:", err);
        setError("Failed to load data");
      } finally {
        setLoading(false); // Hide loading spinner
      }
    }
    fetchData();
  }, []);

  // Send toggle request to backend - fixed error handling
  async function handleToggleCardSwitch(device, dataType) {
    try {
      const toggleState = device.active ? "off" : "on";

      // Make API call
      await axios.get(`${backendUrl}/${device.devices}/${toggleState}`);

      // Update state based on which data type was toggled
      switch (dataType) {
        case "top":
          setDevicesTopData((prevData) =>
            prevData.map((d) =>
              d.devices === device.devices ? { ...d, active: !d.active } : d
            )
          );
          break;
        case "scenes":
          setDevicesScenesData((prevData) =>
            prevData.map((d) =>
              d.devices === device.devices ? { ...d, active: !d.active } : d
            )
          );
          break;
        case "frequent":
          setDevicesFrequentlyData((prevData) =>
            prevData.map((d) =>
              d.devices === device.devices ? { ...d, active: !d.active } : d
            )
          );
          break;
        default:
          console.warn("Unknown data type:", dataType);
      }
    } catch (err) {
      console.error("Toggle Error:", err);
      // Provide user feedback for error
      setError("Failed to toggle device");
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    }
  }

  // Helper function to render icons
  const renderIcon = (icon) => {
    const iconsMap = {
      Tv: <Tv />,
      Lightbulb: <Lightbulb />,
      Fan: <Fan />,
      Coffee: <Coffee />,
      Moon: <Moon />,
      Sun: <Sun />,
      Thermometer: <Thermometer />,
      Music: <Music />,
      Lock: <Lock />,
      Bell: <Bell />,
    };
    return iconsMap[icon] || <Plus />; // Default icon if no match
  };

  // Room filtering
  const rooms = ["All", "Living Room", "Bedroom", "Kitchen", "Bathroom"];

  const filterByRoom = (data) => {
    if (!Array.isArray(data)) return [];
    if (currentRoom === "All") return data;
    return data.filter((device) => device.room === currentRoom);
  };

  return (
    <>
      <Loading isLoading={loading} />
      <div className="p-1">
        {/* Error notification */}
        {error && (
          <div className="fixed top-4 right-4 bg-red-500 text-white p-3 rounded-lg shadow-lg z-50">
            {error}
          </div>
        )}

        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <div className="text-4xl font-extrabold text-purple-700">
              My Home
            </div>
            <div
              className={
                isBlackBg ? "text-gray-300 text-sm" : "text-gray-500 text-sm"
              }
            >
              Welcome back!
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleBackground}
              className={
                isBlackBg
                  ? "p-2 rounded-full bg-gray-700"
                  : "p-2 rounded-full bg-gray-200"
              }
            >
              {isBlackBg ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="rounded-full w-10 h-10 flex justify-center items-center text-white bg-purple-700">
              <Plus />
            </div>
          </div>
        </div>

        {/* Weather & Quick Stats Card */}
        <div
          className={
            isBlackBg
              ? "rounded-xl p-4 mb-6 bg-gray-800 shadow-md"
              : "rounded-xl p-4 mb-6 bg-white shadow-md"
          }
        >
          <div className="flex justify-between items-center">
            <div>
              <p
                className={
                  isBlackBg ? "text-sm text-gray-300" : "text-sm text-gray-500"
                }
              >
                Current Weather
              </p>
              <p className="text-2xl font-bold">{weatherData.temp}</p>
              <p className="text-sm">{weatherData.condition}</p>
            </div>
            <div>
              <p
                className={
                  isBlackBg ? "text-sm text-gray-300" : "text-sm text-gray-500"
                }
              >
                Active Devices
              </p>
              <p className="text-2xl font-bold text-center">
                {(Array.isArray(devicesTopData)
                  ? devicesTopData.filter((d) => d.active).length
                  : 0) +
                  (Array.isArray(devicesFrequentlyData)
                    ? devicesFrequentlyData.filter((d) => d.active).length
                    : 0)}
              </p>
            </div>
            <div>
              <Sun size={40} className="text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Room Selection */}
        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex gap-2">
            {rooms.map((room) => (
              <button
                key={room}
                onClick={() => setCurrentRoom(room)}
                className={
                  currentRoom === room
                    ? "px-4 py-2 rounded-full text-sm whitespace-nowrap bg-purple-700 text-white"
                    : `px-4 py-2 rounded-full text-sm whitespace-nowrap ${
                        isBlackBg
                          ? "bg-gray-800 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`
                }
              >
                {room}
              </button>
            ))}
          </div>
        </div>

        {/* Favorite Section */}
        <div className="text-2xl font-bold mb-4 text-purple-700">Favorites</div>
        <div
          id="top"
          className="flex gap-4 mb-6 overflow-x-auto pb-2"
          style={{
            whiteSpace: "nowrap",
            maxWidth: "100vw",
          }}
        >
          {filterByRoom(devicesTopData).map((device, index) => (
            <div
              key={index}
              className="min-w-[150px] snap-start"
              style={{ flex: "0 0 auto" }}
            >
              <CardSwitch
                title={device.title}
                devices={device.devices}
                active={device.active}
                connected={device.connected}
                button={true}
                icon={renderIcon(device.icon)}
                darkMode={isBlackBg}
                handleToggle={() => handleToggleCardSwitch(device, "top")}
              />
            </div>
          ))}
          <div
            className="min-w-[150px] snap-start"
            style={{ flex: "0 0 auto" }}
          >
            <div
              className={
                isBlackBg
                  ? "h-full flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-700 text-gray-400"
                  : "h-full flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-300 text-gray-500"
              }
            >
              <Plus size={24} />
              <span className="mt-1 text-sm">Add Device</span>
            </div>
          </div>
        </div>

        {/* Scenes Section with new UI */}
        <div className="text-2xl font-bold mb-4 text-purple-700">Scenes</div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {filterByRoom(devicesScenesData).map((scene, index) => (
            <div
              key={index}
              className={
                isBlackBg
                  ? `p-4 rounded-xl bg-gray-800 shadow-sm cursor-pointer ${
                      scene.active
                        ? "border-2 border-purple-500"
                        : "border border-gray-700"
                    }`
                  : `p-4 rounded-xl bg-white shadow-sm cursor-pointer ${
                      scene.active
                        ? "border-2 border-purple-500"
                        : "border border-gray-200"
                    }`
              }
              onClick={() => handleToggleCardSwitch(scene, "scenes")}
            >
              <div className="flex items-center gap-3">
                <div
                  className={
                    scene.active
                      ? "p-2 rounded-full text-white bg-purple-600"
                      : `p-2 rounded-full ${
                          isBlackBg
                            ? "bg-gray-700 text-gray-300"
                            : "bg-gray-200 text-gray-500"
                        }`
                  }
                >
                  {renderIcon(scene.icon)}
                </div>
                <div>
                  <div className="font-medium">{scene.title}</div>
                  <div
                    className={
                      isBlackBg
                        ? "text-xs text-gray-400"
                        : "text-xs text-gray-500"
                    }
                  >
                    {scene.active ? "Active" : "Inactive"}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div
            className={
              isBlackBg
                ? "p-4 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-700 text-gray-400"
                : "p-4 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300 text-gray-500"
            }
          >
            <div className="flex flex-col items-center">
              <Plus size={24} />
              <span className="mt-1 text-sm">Add Scene</span>
            </div>
          </div>
        </div>

        {/* Frequent Section with updated grid */}
        <div className="text-2xl font-bold mb-4 text-purple-700">
          Frequently Used
        </div>
        <div className="grid grid-cols-2 gap-4">
          {filterByRoom(devicesFrequentlyData).map((device, index) => (
            <CardSwitch
              key={index}
              title={device.title}
              devices={device.devices}
              active={device.active}
              connected={device.connected}
              button={true}
              icon={renderIcon(device.icon)}
              darkMode={isBlackBg}
              handleToggle={() => handleToggleCardSwitch(device, "frequent")}
            />
          ))}
          <div
            className={
              isBlackBg
                ? "h-32 flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-700 text-gray-400"
                : "h-32 flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-300 text-gray-500"
            }
          >
            <Plus size={24} />
            <span className="mt-1 text-sm">Add Device</span>
          </div>
        </div>

        {/* Add spacing for bottom navigation */}
        <div className="h-24"></div>
      </div>
    </>
  );
}

// Icon components with renamed functions
const HomeIcon = (props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size || 24}
      height={props.size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
};

const SettingsIcon = (props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size || 24}
      height={props.size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
};

export default Home;
