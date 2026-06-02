import "./ManageLocations.css";
import { useState } from "react";
import BottomNav from "../components/BottomNav";

type AvailableLocation = {
  id: number;
  name: string;
  type: string;
  density: string;
  lastUpdated: string;
  address: string;
  pos: [number, number];
};

export default function ManageLocations() {
  const [locations] = useState<AvailableLocation[]>([
    {
      id: 1,
      name: "Cebu City Public Library",
      type: "Public Library",
      density: "Medium",
      lastUpdated: "5 mins ago",
      address: "Osmeña Blvd, Cebu City",
      pos: [10.3095, 123.8931],
    },
    {
      id: 2,
      name: "Vicente Sotto Medical Center",
      type: "Hospital",
      density: "High",
      lastUpdated: "2 mins ago",
      address: "M. Velez St, Cebu City",
      pos: [10.3117, 123.8915],
    },
  ]);

  return (
    <div className="manage-locations-page">
      <h1 className="page-label">Manage Locations</h1>
      <div className="favorites-list">
        {locations.length === 0 ? (
          <p className="empty-text">No locations added yet.</p>
        ) : (
          locations.map((location) => (
            <div key={location.id} className="favorite-card">
              <h3>{location.name}</h3>
              <p className="favorite-type">{location.type}</p>
              <p className="favorite-item">Density: {location.density}</p>
              <p className="favorite-item">
                Last updated: {location.lastUpdated}
              </p>
              <p className="favorite-item">Address: {location.address}</p>
            </div>
          ))
        )}
      </div>

      <div className="actions">
        <button className="add-button">Add Location</button>
        <button className="remove-button">Remove Location</button>
        <button className="update-button">Update Location</button>
      </div>

      <BottomNav />
    </div>
  );
}
