import React from 'react';

const Discover = () => {
  const foodItems = [
    { id: 1, title: 'Fresh Apples', donor: 'Red Deer Groceries', distance: '1.2km' },
    { id: 2, title: 'Whole Wheat Bread', donor: 'Baker’s Delight', distance: '0.8km' },
    { id: 3, title: 'Mixed Vegetables', donor: 'Community Garden', distance: '2.5km' },
  ];

  return (
    <div className="flex min-h-screen bg-fb-mint">
      {/* Sidebar Filter - Left */}
      <aside className="w-64 bg-white p-6 border-r hidden md:block">
        <h3 className="font-bold text-fb-dark mb-4">Filters</h3>
        <div className="space-y-4">
          <label className="block text-sm">Distance (km)</label>
          <input type="range" className="w-full accent-fb-light" />
          <button className="w-full bg-fb-light text-white py-2 rounded-lg text-sm">Apply</button>
        </div>
      </aside>

      {/* Main Content - Right */}
      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-fb-dark">Available Food Near You</h2>
          <div className="flex gap-4">
            <input type="text" placeholder="Search..." className="p-2 border rounded-lg" />
            <div className="w-10 h-10 bg-fb-dark rounded-full"></div> {/* Profile Icon */}
          </div>
        </header>

        {/* Food Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {foodItems.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
              <div className="h-40 bg-gray-200"></div> {/* Food Image Placeholder */}
              <div className="p-4">
                <h4 className="font-bold text-fb-dark">{item.title}</h4>
                <p className="text-xs text-gray-500">{item.donor} • {item.distance}</p>
                <button className="w-full mt-4 border-2 border-fb-light text-fb-light font-bold py-2 rounded-xl hover:bg-fb-light hover:text-white transition-colors">
                  Claim Item
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Discover;