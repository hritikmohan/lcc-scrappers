import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { client } from "../../utils/http-client.js";
import qs from "querystring";
import { get, find, startsWith, omit, pick, omitBy } from "lodash-es";
import { writeFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getPnrDetails = async (req, res) => {
  const file = "[ getPnrDetails ]";

  try {
    const { pnr, emailOrLastName } = req.query;

    console.log(`\n${file}===== 1. Fetching MyBookings =====`);
    await client.get("https://book.goindigo.in/Member/MyBookingsAEM", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "application/json",
        Referer: "https://www.goindigo.in/",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    console.log(`\n${file}===== 2. Retrieving Booking Details =====`);
    const formData = {
      "indiGoRetrieveBooking.EmailAddress": "",
      "indiGoRetrieveBooking.IndiGoRegisteredStrategy":
        "Nps.IndiGo.Strategies.IndigoValidatePnrContactNameStrategy, Nps.IndiGo",
      "indiGoRetrieveBooking.IsToEmailItinerary": "false",
      "indiGoRetrieveBooking.LastName": emailOrLastName,
      "indiGoRetrieveBooking.RecordLocator": pnr,
      typeSelected: "SearchByPNR",
    };

    const retrieveData = await client.post(
      "https://book.goindigo.in/Booking/RetrieveAEM",
      qs.stringify(formData),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Origin: "https://www.goindigo.in",
          Referer: "https://www.goindigo.in/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          Accept: "*/*",
          Connection: "keep-alive",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
        },
      }
    );

    const { international, plKey } = retrieveData.data.indiGoRetrieveBooking;
    
    console.log(`\n${file}===== 3. Loading Itinerary Page =====`);
    const itineraryUrl = `https://www.goindigo.in/bookings/itinerary.html?plKey=${plKey}`;
    const itineraryHtml = await client.get(itineraryUrl, {
      headers: {
        "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        Referer: "https://www.goindigo.in/",
      },
    });

    // console.log(itineraryHtml);
    // await writeFile('response.txt', itineraryHtml.data, 'utf8');

    const msLoginUserKey = await extractMsLoginUserKey(itineraryHtml.data);
    const subscriptionKey = await extractSKey(itineraryHtml.data);

    console.log(`\n${file}===== 4. Creating Session Token =====`);
    const tokenData = {
      strToken: "",
      subscriptionKey: subscriptionKey,
    };

    const tokenResponse = await client.post(
      "https://api-prod-session-skyplus6e.goindigo.in/v1/token/create",
      tokenData,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept: "application/json",
          Origin: "https://www.goindigo.in",
          Referer: "https://www.goindigo.in/",
          user_key: msLoginUserKey,
        },
      }
    );
    const token = JSON.parse(tokenResponse.data).data.token.token;
    console.log(`\n${file}[Token Creation Result]`);
    console.log(`${file}Status:`, tokenResponse.status);
    console.log(`${file}Token Received:`, token ? "Yes" : "No");

    console.log(`\n${file}//////// Getting UserKey ////////`);
    const filePath = path.join(
      __dirname,
      "../../",
      "constants",
      "indigo-user-key.json"
    );
    const data = fs.readFileSync(filePath, "utf8");
    const { userKey } = JSON.parse(data);

    console.log(`\n${file}===== 5. Fetching Itinerary Details =====`);
    const itineraryApiResponse = await client.get(
      `https://api-prod-itinerary-skyplus6e.goindigo.in/v1/itinerary?pl=${plKey}`,
      {
        headers: {
          Host: "api-prod-itinerary-skyplus6e.goindigo.in",
          "User-Agent":
            "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0",
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          Referer: "https://www.goindigo.in/",
          "Content-Type": "application/json",
          Authorization: token,
          User_key: userKey,
          Origin: "https://www.goindigo.in",
          Connection: "keep-alive",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
          Priority: "u=4",
          TE: "trailers",
        },
      }
    );

    console.log(`\n${file}[Itinerary API Response]`);
    console.log(`${file}Status:`, itineraryApiResponse.status);

    const finalResponse = await parseFinalTicketResponse(
      itineraryApiResponse?.data?.data
    );

    res.status(200).json({
      status: 200,
      success: true,
      message: "PNR details fetched successfully",
      data: finalResponse,
    });

    console.log(`\n${file}===== All 5 requests completed successfully =====`);
  } catch (error) {
    console.error(`\n${file}[Final Error]`, error.message);
    if (error.response) {
      console.error(
        file,
        "Failed at step:",
        error.response.config.url.includes("itinerary?pl=")
          ? "Itinerary API"
          : error.response.config.url.includes("token/create")
          ? "Token Creation"
          : error.response.config.url.includes("itinerary.html")
          ? "Itinerary Page"
          : error.response.config.url.includes("RetrieveAEM")
          ? "Retrieve Booking"
          : error.response.config.url.includes("MyBookings")
          ? "MyBookings API"
          : "Initial Page Load"
      );

      console.error(file, "Status:", error.response.status);
      console.error(file, "Response Data:", error.response.data);
    }
    res.status(500).json({
      status: 500,
      success: false,
      error: error.response.data.errors.message,
    });
  }
};

async function extractMsLoginUserKey(htmlContent) {
  const pattern = /winObj\["msd"\]\["msLoginUserKey"\]\s*=\s*"([^"]+)"/;
  const match = htmlContent.match(pattern);
  return match ? match[1] : null;
}

async function extractSKey(htmlContent) {
  const pattern = /winObj\["msd"\]\["sKey"\]\s*=\s*"([^"]+)"/;
  const match = htmlContent.match(pattern);
  return match ? match[1] : null;
}

async function parseFinalTicketResponse(finalResponseObject) {
  const record = finalResponseObject;

  const result = {
    bookingDetails: pick(record.bookingDetails, [
      "recordLocator",
      "bookingStatus",
      "paymentStatus",
      "bookedDate",
      "createdDate",
      "owningCarrierCode",
      "currencyCode",
    ]),
    journeysDetail: record.journeysDetail.map((journey) => {
      return {
        journeyKey: journey.journeyKey,
        flightType: journey.flightType,
        stops: journey.stops,
        journeydetail: omit(journey.journeydetail, ["baggageData"]),
      };
    }),
    priceBreakdown: record.priceBreakdown,
    // contacts: record.contacts,
    passengers: record.passengers.map((passenger) => {
      const passengerName = omitBy(
        passenger.name,
        (value, key) => value === null
      );
      return {
        passengerKey: passenger.passengerKey,
        passengerAlternateKey: passenger.passengerAlternateKey,
        name: passenger
          ? `${get(passengerName, "title", "")} ${get(
              passengerName,
              "first",
              ""
            )} ${get(passengerName, "middle", "")} ${get(
              passengerName,
              "last",
              ""
            )} ${get(passengerName, "suffix", "")}`.trim()
          : null,
        eTicketNumber: passenger.eTicketNumber,
        seatsAndSsrs: passenger.seatsAndSsrs,
      };
    }),
    indigoRefundCSAmount: record.indigoRefundCSAmount,
    indigoTaxRefund: record.indigoTaxRefund,
    rawResponse: record,
  };

  return result;
}

export { getPnrDetails };
