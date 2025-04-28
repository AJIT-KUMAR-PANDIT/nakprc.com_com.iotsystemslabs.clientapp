import React, { useState } from "react";
import { User, Mail, Edit, LogOut, Settings, Wifi, Power } from "lucide-react";

function Profile({ isBlackBg }) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "John Doe",
    email: "john.doe@example.com",
    profileImage: "https://via.placeholder.com/150",
    smartHomeStatus: "Connected",
    activeDevices: 5,
  });

  const handleEdit = () => setIsEditing(!isEditing);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogout = () => {
    alert("Logged out successfully!");
    // Add logout logic here
  };

  return (
    <div
      className={`p-6 rounded-2xl shadow-lg space-y-6 ${
        isBlackBg
          ? "bg-gradient-to-br from-gray-900 to-black text-white"
          : "bg-gradient-to-br from-white to-gray-200 text-gray-700"
      }`}
    >
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <img
          src={profileData.profileImage}
          alt="Profile"
          className="w-20 h-20 rounded-full border-4 border-blue-500 shadow-lg"
        />
        <div>
          <h2 className="text-2xl font-bold">{profileData.name}</h2>
          <p className="text-sm text-gray-400">{profileData.email}</p>
        </div>
      </div>

      {/* Smart Home Status */}
      <div
        className={`p-3 rounded-lg text-center ${
          profileData.smartHomeStatus === "Connected"
            ? "bg-green-500 text-white"
            : "bg-red-500 text-white"
        }`}
      >
        <Wifi size={20} className="inline-block mr-2" />
        Smart Home Status: {profileData.smartHomeStatus}
      </div>

      {/* Active Devices */}
      <div
        className={`p-3 rounded-lg text-center ${
          isBlackBg ? "bg-gray-700" : "bg-gray-300"
        }`}
      >
        <Power size={20} className="inline-block mr-2 text-blue-500" />
        Active Devices: {profileData.activeDevices}
      </div>

      {/* Editable Fields */}
      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm block mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={profileData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm block mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={profileData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleEdit}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500"
          >
            Save
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <User size={20} /> <span>{profileData.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <Mail size={20} /> <span>{profileData.email}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 w-full bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Edit size={18} /> Edit Profile
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 w-full bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>

          {/* Automation Settings */}
          <div className="mt-4">
            <button
              className="flex items-center gap-2 px-4 py-2 w-full bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              <Settings size={18} /> Automation Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
