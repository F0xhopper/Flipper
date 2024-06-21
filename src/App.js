import logo from "/Users/edenphillips/Desktop/Projects/flipper/src/Images/LogoImage.png";
import ebayListingExampleImage from "/Users/edenphillips/Desktop/Projects/flipper/src/Images/ebayListingImageExample.png";
import { useState } from "react";
import axios from "axios";
function App() {
  const [searchInput, setSearchInput] = useState("");
  const [listings, setListings] = useState([]);
  const [averagePrice, setAveragePrice] = useState(null);

  const fetchSoldListings = async (query) => {
    try {
      const response = await fetch(
        `http://localhost:3200/api/ebay?keywords=${encodeURIComponent(
          searchInput
        )}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }
      const data = await response.json();
      console.log(data.items);
      return data.items;
    } catch (error) {
      console.error("Error fetching sold listings:", error);
      return [];
    }
  };

  const handleSearch = async () => {
    const soldListings = await fetchSoldListings(searchInput);

    setListings(soldListings);

    if (soldListings.length > 0) {
      const total = soldListings.reduce(
        (sum, item) => sum + parseFloat(item.price), // Assuming each item has a 'price' field
        0
      );
      const average = total / soldListings.length;
      setAveragePrice(average.toFixed(2)); // Setting average price state
    } else {
      setAveragePrice(null);
    }
  };

  return (
    <div className="App">
      <div className="titleContainer">
        <img className="logoImage" src={logo}></img>
      </div>
      <div className="searchInputContainer">
        <input
          placeholder="Search item"
          className="searchInput"
          onChange={(e) => setSearchInput(e.target.value)}
        ></input>
        <button className="searchButton" onClick={handleSearch}>
          Search
        </button>
      </div>
      <div className="resultsContainer">
        <div className="averagePriceContainer">
          <h4 className="averagePriceIntroText">
            {" "}
            The average price for '{searchInput}'
            <br /> based on the last 10 sold listings is:
          </h4>
          <h1 className="averagePriceNumberText">£{averagePrice}</h1>
        </div>
        <div className="listingsDisplayContainer">
          {listings.map((lsiting) => {
            return (
              <a target="_blank" href={lsiting.url}>
                <div className="individualListingContainer">
                  <img
                    className="individualListingImage"
                    src={lsiting.imageUrl}
                  ></img>
                  <div className="individualListingTextContainer">
                    <h4 className="individualListingTitleText">
                      {lsiting.title}
                    </h4>{" "}
                    <h4 className="individualListingPriceText">
                      Sold for £{lsiting.price}
                    </h4>{" "}
                    <h4 className="individualListingDateText">
                      {lsiting.soldDate}
                    </h4>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
