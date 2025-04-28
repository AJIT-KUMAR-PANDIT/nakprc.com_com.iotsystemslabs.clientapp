import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent } from "../components/Card";
import { Loading } from "../components/Loading";
import { 
  Search, 
  X, 
  Battery, 
  Clock, 
  Home, 
  Zap, 
  ChevronUp, 
  ChevronDown,
  ArrowUpRight,
  AlertTriangle
} from "lucide-react";

const Usage = () => {
  const backendUrl = "/usage.json";
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState([]);
  const [filteredUsageData, setFilteredUsageData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("deviceName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [activeFilters, setActiveFilters] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [totalConsumption, setTotalConsumption] = useState(0);

  useEffect(() => {
    const fetchUsageData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(backendUrl);
        
        // Calculate total consumption
        const total = response.data.reduce((sum, item) => sum + item.powerConsumption, 0);
        setTotalConsumption(total);
        
        // Add efficiency rating and status
        const enhancedData = response.data.map(item => ({
          ...item,
          efficiency: calculateEfficiency(item.powerConsumption, item.usageHours),
          status: item.usageHours > 8 ? "heavy" : item.usageHours > 4 ? "moderate" : "light"
        }));
        
        setUsageData(enhancedData);
        setFilteredUsageData(enhancedData);
      } catch (err) {
        console.error("Error fetching usage data:", err);
        setError("Failed to load usage data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsageData();
  }, []);

  // Calculate efficiency rating
  const calculateEfficiency = (consumption, hours) => {
    const ratio = consumption / hours;
    if (ratio < 0.5) return "excellent";
    if (ratio < 1) return "good";
    if (ratio < 2) return "fair";
    return "poor";
  };

  // Filter and sort data
  useEffect(() => {
    let filteredData = usageData.filter(
      (item) =>
        item.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.room.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Apply additional filters
    if (activeFilters.length > 0) {
      filteredData = filteredData.filter(item => 
        activeFilters.includes(item.status) || 
        activeFilters.includes(item.efficiency)
      );
    }
    
    // Sort data
    filteredData.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "deviceName") {
        comparison = a.deviceName.localeCompare(b.deviceName);
      } else if (sortBy === "room") {
        comparison = a.room.localeCompare(b.room);
      } else if (sortBy === "usageHours") {
        comparison = a.usageHours - b.usageHours;
      } else if (sortBy === "powerConsumption") {
        comparison = a.powerConsumption - b.powerConsumption;
      } else if (sortBy === "efficiency") {
        const efficiencyRank = { excellent: 1, good: 2, fair: 3, poor: 4 };
        comparison = efficiencyRank[a.efficiency] - efficiencyRank[b.efficiency];
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
    
    setFilteredUsageData(filteredData);
  }, [searchTerm, usageData, sortBy, sortDirection, activeFilters]);

  // Toggle sort direction
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
  };

  // Toggle filters
  const toggleFilter = (filter) => {
    if (activeFilters.includes(filter)) {
      setActiveFilters(activeFilters.filter(f => f !== filter));
    } else {
      setActiveFilters([...activeFilters, filter]);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "heavy": return "text-red-500";
      case "moderate": return "text-yellow-500";
      case "light": return "text-green-500";
      default: return "text-gray-500";
    }
  };

  // Get efficiency color
  const getEfficiencyColor = (efficiency) => {
    switch (efficiency) {
      case "excellent": return "text-green-500";
      case "good": return "text-teal-500";
      case "fair": return "text-amber-500";
      case "poor": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  // Get efficiency icon
  const getEfficiencyIcon = (efficiency) => {
    switch (efficiency) {
      case "excellent": return <ArrowUpRight size={16} className="text-green-500" />;
      case "good": return <ChevronUp size={16} className="text-teal-500" />;
      case "fair": return <ChevronDown size={16} className="text-amber-500" />;
      case "poor": return <AlertTriangle size={16} className="text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {loading && <Loading />}
      
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
            <AlertTriangle size={20} className="mr-2" />
            <p>{error}</p>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-purple-800">Usage Statistics</h2>
            <p className="text-gray-600">Monitor your smart home device usage and power consumption</p>
          </div>
          
          {/* Summary Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 mt-4 md:mt-0 w-full md:w-auto">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-full mr-3">
                <Zap size={24} className="text-purple-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Power Consumption</p>
                <p className="text-xl font-bold text-purple-800">{totalConsumption.toFixed(2)} kWh</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
            {/* Search */}
            <div className="relative flex-grow mb-4 md:mb-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={20} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by device or room..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
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
            
            {/* Sort Options */}
            <div className="flex-shrink-0">
              <select
                value={sortBy}
                onChange={(e) => handleSort(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
              >
                <option value="deviceName">Sort by Name</option>
                <option value="room">Sort by Room</option>
                <option value="usageHours">Sort by Usage Hours</option>
                <option value="powerConsumption">Sort by Power Consumption</option>
                <option value="efficiency">Sort by Efficiency</option>
              </select>
            </div>
            
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="mt-4 md:mt-0 md:ml-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center"
            >
              <span className="mr-2">Filters</span>
              {showFilters ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          
          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                <p className="text-sm text-gray-500 mr-2 self-center">Usage:</p>
                <button
                  onClick={() => toggleFilter("light")}
                  className={`px-3 py-1 rounded-full text-sm ${
                    activeFilters.includes("light")
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Light
                </button>
                <button
                  onClick={() => toggleFilter("moderate")}
                  className={`px-3 py-1 rounded-full text-sm ${
                    activeFilters.includes("moderate")
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Moderate
                </button>
                <button
                  onClick={() => toggleFilter("heavy")}
                  className={`px-3 py-1 rounded-full text-sm ${
                    activeFilters.includes("heavy")
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Heavy
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-3">
                <p className="text-sm text-gray-500 mr-2 self-center">Efficiency:</p>
                <button
                  onClick={() => toggleFilter("excellent")}
                  className={`px-3 py-1 rounded-full text-sm ${
                    activeFilters.includes("excellent")
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Excellent
                </button>
                <button
                  onClick={() => toggleFilter("good")}
                  className={`px-3 py-1 rounded-full text-sm ${
                    activeFilters.includes("good")
                      ? "bg-teal-100 text-teal-800"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Good
                </button>
                <button
                  onClick={() => toggleFilter("fair")}
                  className={`px-3 py-1 rounded-full text-sm ${
                    activeFilters.includes("fair")
                      ? "bg-amber-100 text-amber-800"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Fair
                </button>
                <button
                  onClick={() => toggleFilter("poor")}
                  className={`px-3 py-1 rounded-full text-sm ${
                    activeFilters.includes("poor")
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Poor
                </button>
              </div>
              
              {activeFilters.length > 0 && (
                <div className="mt-3 text-right">
                  <button
                    onClick={() => setActiveFilters([])}
                    className="text-sm text-purple-600 hover:text-purple-800"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Data Display */}
        {filteredUsageData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsageData.map((item) => (
              <Card key={item.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex justify-between">
                      <h3 className="font-semibold text-lg text-purple-900">{item.deviceName}</h3>
                      <span className={`text-sm px-2 py-1 rounded-full flex items-center ${getStatusColor(item.status)} bg-opacity-20`}>
                        {item.status === "heavy" && <Battery size={14} className="mr-1" />}
                        {item.status === "moderate" && <Battery size={14} className="mr-1" />}
                        {item.status === "light" && <Battery size={14} className="mr-1" />}
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center mt-1 text-gray-500">
                    <Home size={16} className="mr-1" />
                      <span className="text-sm">{item.room}</span>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex justify-between mb-3">
                      <div className="flex items-center">
                        <Clock size={16} className="text-purple-600 mr-2" />
                        <div>
                          <p className="text-sm text-gray-500">Usage Hours</p>
                          <p className="font-semibold">{item.usageHours} hrs</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Zap size={16} className="text-purple-600 mr-2" />
                        <div>
                          <p className="text-sm text-gray-500">Power Usage</p>
                          <p className="font-semibold">{item.powerConsumption} kWh</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Efficiency Rating */}
                    <div className="mt-3">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-500">Efficiency Rating:</p>
                        <div className={`flex items-center ${getEfficiencyColor(item.efficiency)}`}>
                          {getEfficiencyIcon(item.efficiency)}
                          <span className="ml-1 font-medium">
                            {item.efficiency.charAt(0).toUpperCase() + item.efficiency.slice(1)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Visual Progress Bar */}
                      <div className="mt-2 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            item.efficiency === "excellent" ? "bg-green-500" :
                            item.efficiency === "good" ? "bg-teal-500" :
                            item.efficiency === "fair" ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{
                            width: `${
                              item.efficiency === "excellent" ? "100%" :
                              item.efficiency === "good" ? "75%" :
                              item.efficiency === "fair" ? "50%" : "25%"
                            }`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="inline-flex items-center justify-center p-4 bg-gray-100 rounded-full mb-4">
              <Search size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No matching devices found</h3>
            <p className="text-gray-500">Try adjusting your search filters</p>
            {searchTerm || activeFilters.length > 0 ? (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setActiveFilters([]);
                }}
                className="mt-4 text-purple-600 hover:text-purple-800 font-medium"
              >
                Clear all filters
              </button>
            ) : null}
          </div>
        )}
        
        {/* Usage Tips Section */}
        <div className="mt-8 bg-purple-50 rounded-lg p-6 border border-purple-100">
          <h3 className="text-lg font-semibold text-purple-900 mb-3">Power Saving Tips</h3>
          <ul className="space-y-2">
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 text-purple-600 mr-2">•</div>
              <p className="text-gray-700">Set devices to automatically power down when not in use</p>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 text-purple-600 mr-2">•</div>
              <p className="text-gray-700">Use smart schedules to turn off lights during daylight hours</p>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 text-purple-600 mr-2">•</div>
              <p className="text-gray-700">Consider upgrading devices with "Poor" efficiency ratings</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Usage;