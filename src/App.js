import React, { useState, useEffect } from "react";
import logo from "/Users/edenphillips/Desktop/Projects/flipper/src/Images/LogoImage.png";
import ebayListingExampleImage from "/Users/edenphillips/Desktop/Projects/flipper/src/Images/ebayListingImageExample.png";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

// Register the chart components
ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  Tooltip
);

function App() {
  const [searchInput, setSearchInput] = useState("");
  const [sliderInput, setSliderInput] = useState("200");
  const [listings, setListings] = useState([]);
  const [averagePrice, setAveragePrice] = useState(null);
  const [chartData, setChartData] = useState({});
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [soldLastMonth, setSoldLastMonth] = useState(0);
  const [titleDisplayLength, setTitleDisplayLength] = useState(50); // Default length
  const [loading, setLoading] = useState(false);
  const [priceRange, setPriceRange] = useState({ highest: 0, lowest: 0 });
  const [averageSalesPerWeek, setAverageSalesPerWeek] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState("both");

  useEffect(() => {
    const handleResize = () => {
      // Adjust title display length based on container width
      const containerWidth = window.innerWidth; // Adjust this to your specific container width
      if (containerWidth < 600) {
        setTitleDisplayLength(20); // Example: show fewer characters on smaller screens
      } else {
        setTitleDisplayLength(50); // Default length for larger screens
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Call it once to set the initial value

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchSoldListings = async () => {
    try {
      let url = `http://127.0.0.1:5000/scrape?item=${encodeURIComponent(
        searchInput
      )}&limit=${sliderInput}`;
      if (selectedFormat === "buy-it-now") {
        url += "&format=buy-it-now";
      } else if (selectedFormat === "auction") {
        url += "&format=auction";
      } else if (selectedFormat === "both") {
        url += "&format=both";
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const data = await response.json();
      console.log(data);
      return data;
    } catch (error) {
      console.error("Error fetching sold listings:", error);
      return [];
    }
  };

  const calculateSoldLastMonth = (listings) => {
    const currentDate = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(currentDate.getMonth() - 1);

    const recentListings = listings.filter((listing) => {
      const soldDate = new Date(listing.soldDate);
      return soldDate > oneMonthAgo;
    });

    setSoldLastMonth(recentListings.length);
  };

  const calculateAveragePrice = (listings) => {
    const total = listings.reduce(
      (sum, item) => sum + parseFloat(item.price),
      0
    );
    return total / listings.length;
  };
  const calculatePriceRange = (listings) => {
    const prices = listings.map((listing) => parseFloat(listing.price));
    const highestPrice = Math.max(...prices);
    const lowestPrice = Math.min(...prices);
    return {
      highest: highestPrice,
      lowest: lowestPrice,
    };
  };

  const calculateAverageSalesPerWeek = (listings) => {
    if (listings.length === 0) return 0;

    const firstSaleDate = new Date(listings[0].soldDate);
    const lastSaleDate = new Date(listings[listings.length - 1].soldDate);
    const weeksDiff = Math.abs(
      (lastSaleDate - firstSaleDate) / (1000 * 60 * 60 * 24 * 7)
    );

    return (listings.length / weeksDiff).toFixed(2);
  };
  const handleClear = () => {
    setSearchInput(""); // Reset search input
    setSliderInput("200"); // Reset slider input

    setChartData({}); // Clear chart data
    setSoldLastMonth(0); // Reset sold last month
    setAverageSalesPerWeek(0); // Reset average sales per week
    setPriceRange({ highest: 0, lowest: 0 }); // Reset price range
    setSelectedFormat("both"); // Reset selected format
  };
  const handleSearch = async () => {
    setLoading(true);
    const soldListings = await fetchSoldListings(searchInput);
    setLoading(false);
    if (soldListings.length > 0) {
      soldListings.sort((a, b) => new Date(a.soldDate) - new Date(b.soldDate));
      setListings(soldListings);

      const average = calculateAveragePrice(soldListings);
      setAveragePrice(average.toFixed(2));

      calculateSoldLastMonth(soldListings);

      const averageSales = calculateAverageSalesPerWeek(soldListings);
      setAverageSalesPerWeek(averageSales);

      const range = calculatePriceRange(soldListings);
      setPriceRange(range);

      const dates = soldListings.map((item) =>
        new Date(item.soldDate).toLocaleDateString()
      );
      const prices = soldListings.map((item) => parseFloat(item.price));

      const n = dates.length;
      let sumX = 0,
        sumY = 0,
        sumXY = 0,
        sumXX = 0;
      for (let i = 0; i < n; i++) {
        sumX += i + 1;
        sumY += prices[i];
        sumXX += (i + 1) * (i + 1);
        sumXY += (i + 1) * prices[i];
      }
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      const trendLine = dates.map(
        (_, index) => slope * (index + 1) + intercept
      );

      setChartData({
        labels: dates,
        datasets: [
          {
            label: `Price trend for ${searchInput}`,
            data: prices,
            fill: false,
            backgroundColor: "rgba(75,192,192,0.2)",
            borderColor: "lightgrey",
          },
          {
            label: "Trend Line",
            data: trendLine,
            fill: false,
            borderColor: "lightgrey",
            borderDash: [5, 5],
            pointRadius: 0,
          },
        ],
        options: {
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              mode: "index",
              intersect: false,
            },
          },
        },
      });
    } else {
      setAveragePrice(null);
      setChartData({});
      setSoldLastMonth(0);
      setAverageSalesPerWeek(0);
    }
  };

  const handleListingHover = (index) => {
    setHoveredIndex(index);
    setChartData((prevChartData) => ({
      ...prevChartData,
      datasets: prevChartData.datasets.map((dataset, datasetIndex) => {
        if (datasetIndex === 0) {
          // Update point background color and radius for actual data points
          return {
            ...dataset,
            pointBackgroundColor: dataset.data.map((_, dataIndex) =>
              dataIndex === index ? "blue" : "rgb(0, 152, 0)"
            ),
            pointRadius: dataset.data.map((_, dataIndex) =>
              dataIndex === index ? 9 : 3
            ),
          };
        }
        // Return unchanged trend line dataset
        return dataset;
      }),
    }));
  };

  return (
    <div className="App">
      <div
        style={{ marginTop: averagePrice == null && "300px" }}
        className="titleContainer"
      >
        <img className="logoImage" src={logo} alt="Logo" />
      </div>
      {averagePrice == null && (
        <div className="searchMainContainer">
          <div className="searchInputContainer">
            <input
              placeholder="Search item"
              className="searchInput"
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="searchOptionsContainer">
            {" "}
            <div className="sliderMainContainer">
              <h1 className="sliderTitleText">
                Maximum amount of listings:{" "}
                <span className="sliderTitleTextNumber">{sliderInput}</span>
              </h1>
              <div className="sliderContainer">
                <h1 className="sliderRangeText">1</h1>
                <input
                  onChange={(e) => {
                    setSliderInput(e.target.value);
                  }}
                  type="range"
                  min="1"
                  max="250"
                  value={sliderInput}
                  className="slider"
                ></input>{" "}
                <h1 className="sliderRangeText">250</h1>
              </div>
            </div>
            <div className="checkBoxContainer">
              <label className="radioInput">
                <input
                  type="radio"
                  checked={selectedFormat === "buy-it-now"}
                  onChange={() => setSelectedFormat("buy-it-now")}
                />
                Buy It Now
              </label>
              <label className="radioInput">
                <input
                  type="radio"
                  checked={selectedFormat === "auction"}
                  onChange={() => setSelectedFormat("auction")}
                />
                Auction
              </label>
              <label className="radioInput">
                <input
                  type="radio"
                  checked={selectedFormat === "both"}
                  onChange={() => setSelectedFormat("both")}
                />
                Both
              </label>
            </div>
          </div>{" "}
          <div className="buttonsContainer">
            <button className="clearButton" onClick={handleClear}>
              Clear
            </button>
            <button className="searchButton" onClick={handleSearch}>
              Search
            </button>
          </div>
        </div>
      )}
      {loading && <div className="loadingAnimation">Loading...</div>}
      {averagePrice != null && (
        <div className="resultsContainer">
          <div className="searchAverageContainer">
            <div className="searchMainContainer">
              <div className="searchInputContainer">
                <input
                  placeholder="Search item"
                  className="searchInput"
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <div className="searchOptionsContainer">
                {" "}
                <div className="sliderMainContainer">
                  <h1 className="sliderTitleText">
                    Maximum amount of listings:{" "}
                    <span className="sliderTitleTextNumber">{sliderInput}</span>
                  </h1>
                  <div className="sliderContainer">
                    <h1 className="sliderRangeText">1</h1>
                    <input
                      onChange={(e) => {
                        setSliderInput(e.target.value);
                      }}
                      type="range"
                      min="1"
                      max="250"
                      value={sliderInput}
                      className="slider"
                    ></input>{" "}
                    <h1 className="sliderRangeText">250</h1>
                  </div>
                </div>
                <div className="checkBoxContainer">
                  <label className="radioInput">
                    <input
                      className="radioInput"
                      type="radio"
                      checked={selectedFormat === "buy-it-now"}
                      onChange={() => setSelectedFormat("buy-it-now")}
                    />
                    Buy It Now
                  </label>
                  <label className="radioInput">
                    <input
                      className="radioInput"
                      type="radio"
                      checked={selectedFormat === "auction"}
                      onChange={() => setSelectedFormat("auction")}
                    />
                    Auction
                  </label>
                  <label className="radioInput">
                    <input
                      className="radioInput"
                      type="radio"
                      checked={selectedFormat === "both"}
                      onChange={() => setSelectedFormat("both")}
                    />
                    Both
                  </label>
                </div>{" "}
              </div>{" "}
              <div className="buttonsContainer">
                <button className="clearButton" onClick={handleClear}>
                  Clear
                </button>
                <button className="searchButton" onClick={handleSearch}>
                  Search
                </button>
              </div>
            </div>
            <div className="averagePriceContainer">
              <h4 className="averagePriceIntroText">
                The average price for '{searchInput}' based on the last{" "}
                {listings.length} sold listings is:
              </h4>
              <h1 className="averagePriceNumberText">
                £{averagePrice ? averagePrice : 0}
              </h1>
            </div>
          </div>
          <div className="chartContainer">
            <Line data={chartData} options={{ maintainAspectRatio: false }} />
          </div>
          <div className="listingsStatsContainer">
            <div className="listingsDisplayContainer">
              {listings.map((listing, index) => {
                return (
                  <a
                    className="individualListLink"
                    key={index}
                    target="_blank"
                    href={listing.url}
                    rel="noopener noreferrer"
                    onMouseEnter={() => handleListingHover(index)}
                    onMouseLeave={() => {
                      handleListingHover(null);
                    }}
                  >
                    <div className="individualListingContainer">
                      <img
                        className="individualListingImage"
                        src={listing.imageUrl || ebayListingExampleImage}
                        alt={listing.title}
                      />
                      <div className="individualListingTextContainer">
                        <h4 className="individualListingTitleText">
                          {listing.title}
                        </h4>
                        <div>
                          <div className="individualListingPriceText">
                            Sold for{" "}
                            <span className="individualListingPriceGreenText">
                              £{listing.price}
                            </span>
                          </div>
                          <h4 className="individualListingDateText">
                            {new Date(listing.soldDate).toLocaleDateString()}
                          </h4>
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
            <div className="usefulStatsContainer">
              {soldLastMonth > 0 && (
                <div className="individualStatContainer">
                  <h4 className="statTitleText">
                    Total {searchInput} sales in the last month:
                  </h4>
                  <h1 className="statText">{soldLastMonth}</h1>
                </div>
              )}
              {averageSalesPerWeek > 0 && (
                <div className="individualStatContainer">
                  <h4 className="statTitleText">
                    Average amount of {searchInput} sales per week:
                  </h4>
                  <h1 className="statText">{averageSalesPerWeek}</h1>
                </div>
              )}{" "}
              <div className="individualStatContainer">
                <h4 className="statTitleText">
                  Price range for {searchInput}:
                </h4>
                <h1 className="statText">
                  £{priceRange.lowest} - £{priceRange.highest}
                </h1>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
