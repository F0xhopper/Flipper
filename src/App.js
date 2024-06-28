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
  const [listings, setListings] = useState([]);
  const [averagePrice, setAveragePrice] = useState(null);
  const [chartData, setChartData] = useState({});
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [soldLastMonth, setSoldLastMonth] = useState(0);
  const [titleDisplayLength, setTitleDisplayLength] = useState(50); // Default length
  const [loading, setLoading] = useState(false);
  const [priceChange, setPriceChange] = useState(null); // State for price change

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

  const fetchSoldListings = async (query) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/scrape?item=${encodeURIComponent(searchInput)}`
      );
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

  const handleSearch = async () => {
    setLoading(true);
    const soldListings = await fetchSoldListings(searchInput);
    setLoading(false);
    if (soldListings.length > 0) {
      // Filter listings to only include those from the past month
      soldListings.sort((a, b) => new Date(a.soldDate) - new Date(b.soldDate));

      setListings(soldListings);

      const average = calculateAveragePrice(soldListings);
      setAveragePrice(average.toFixed(2));

      // Calculate the number of items sold in the last month
      calculateSoldLastMonth(soldListings);

      // Calculate the initial average price (first 10% of the listings)
      const initialListings = soldListings.slice(
        0,
        Math.ceil(soldListings.length * 0.1)
      );
      const initialAverage = calculateAveragePrice(initialListings);

      // Calculate the recent average price (last 10% of the listings)
      const recentListings = soldListings.slice(
        -Math.ceil(soldListings.length * 0.1)
      );
      const recentAverage = calculateAveragePrice(recentListings);

      // Calculate the price change
      const priceChange =
        ((recentAverage - initialAverage) / initialAverage) * 100;
      setPriceChange(priceChange.toFixed(2));

      // Prepare data for the chart
      const dates = soldListings.map((item) =>
        new Date(item.soldDate).toLocaleDateString()
      );
      const prices = soldListings.map((item) => parseFloat(item.price));

      // Calculate linear regression (trend line)
      const n = dates.length;
      let sumX = 0,
        sumY = 0,
        sumXY = 0,
        sumXX = 0;
      for (let i = 0; i < n; i++) {
        sumX += i + 1; // x values are 1, 2, 3, ...
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
      setPriceChange(null);
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
      <div className="searchInputContainer">
        <input
          placeholder="Search item"
          className="searchInput"
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button className="searchButton" onClick={handleSearch}>
          Search
        </button>
      </div>
      {loading && <div className="loadingAnimation">Loading...</div>}

      {averagePrice != null && (
        <div className="resultsContainer">
          <div className="averagePriceContainer">
            <h4 className="averagePriceIntroText">
              The average price for '{searchInput}' based on the last{" "}
              {listings.length} sold listings is:
            </h4>
            <h1 className="averagePriceNumberText">
              £{averagePrice ? averagePrice : 0}
            </h1>
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
                          {listing.title.length > titleDisplayLength
                            ? listing.title.slice(0, titleDisplayLength) + "..."
                            : listing.title}
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
                <div className="soldLastMonthContainer">
                  <h4>Total {searchInput} sales in the last month:</h4>
                  <h1>{soldLastMonth}</h1>{" "}
                </div>
              )}
              {priceChange != null && (
                <div className="priceChangeContainer">
                  <h4>
                    Price change since{" "}
                    {new Date(listings[0].soldDate).toLocaleDateString()}:
                  </h4>
                  <h1>{priceChange}%</h1>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
