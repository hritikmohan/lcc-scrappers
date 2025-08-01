import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import axios from "axios";


// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


const file = "[ http-client ]";
const jar = new CookieJar();
const client = wrapper(
  axios.create({
    jar,
    withCredentials: true,
    // proxy: {
    //   host: 'brd.superproxy.io',
    //   port: 33335,
    //   auth: {
    //     username: 'brd-customer-hl_09e77433-zone-tts_proxies',
    //     password: 'm9z4w22mpeye'
    //   }
    // },
    timeout: 15000,
  })
);

// Enhanced interceptors with proxy rotation
client.interceptors.request.use(
  async (config) => {
    // Assign a new proxy for each request
    // config.httpsAgent = new HttpsProxyAgent(proxy);
    // config.proxy = false; // Important: disable default proxy if any

    console.log(
      `\n${file} [${new Date().toISOString()}] [Request] ${config.method.toUpperCase()} ${
        config.url
      }`
    );

    // if (config.data) {
    //   console.log(
    //     "[Request Data]",
    //     typeof config.data === "object"
    //       ? JSON.stringify(config.data)
    //       : config.data
    //   );
    // }

    // Mask sensitive headers in logs
    // const headersToLog = { ...config.headers };
    // if (headersToLog["Authorization"]) {
    //   headersToLog["Authorization"] = "Bearer *****";
    // }
    // if (headersToLog["user_key"]) {
    //   headersToLog["user_key"] = "*****";
    // }
    // console.log("[Request Headers]", headersToLog);

    const cookies = await jar.getCookies(config.url);
    if (cookies.length > 0) {
      console.log(`${file} [Cookies Sent] ${cookies.length} cookies`);
      //   cookies.slice(0, 3).forEach((c) => console.log(`- ${c.key}=${c.value}`));
      //   if (cookies.length > 3)
      //     console.log(`- ...and ${cookies.length - 3} more`);
    }
    return config;
  },
  (error) => {
    console.error(file, "[Request Interceptor Error]", error);
    return Promise.reject(error);
  }
);

// Your existing response interceptor remains the same
client.interceptors.response.use(
  async (response) => {
    console.log(
      `\n${file} [${new Date().toISOString()}] [Response] ${
        response.status
      } from ${response.config.url}`
    );
    // console.log(
    //   "[Response Headers]",
    //   Object.fromEntries(
    //     Object.entries(response.headers).filter(([key]) =>
    //       ["content-type", "set-cookie", "x-powered-by", "server"].includes(
    //         key.toLowerCase()
    //       )
    //     )
    //   )
    // );

    const cookies = await jar.getCookies(response.config.url);
    if (cookies.length > 0) {
      console.log(`${file} [New Cookies] ${cookies.length} cookies`);
      //   cookies
      //     .slice(0, 3)
      //     .forEach((c) => console.log(`- ${c.key} (${c.domain})`));
      //   if (cookies.length > 3)
      //     console.log(`- ...and ${cookies.length - 3} more`);
    }

    // console.log(
    //   "[Response Data]",
    //   typeof response.data === "object"
    //     ? JSON.stringify(response.data, null, 2).substring(0, 500) +
    //         (JSON.stringify(response.data).length > 500 ? "..." : "")
    //     : response.data.toString().substring(0, 500) +
    //         (response.data.length > 500 ? "..." : "")
    // );

    return response;
  },
  (error) => {
    const errorTime = new Date().toISOString();
    console.error(`\n${file} [${errorTime}] [Request Failed] ${error.message}`);
    if (error.response) {
      console.error(file, "URL:", error.response.config.url);
      console.error(file, "Status:", error.response.status);
      console.error(file, "Headers:", error.response.headers);
      if (error.response.data) {
        const errorData =
          typeof error.response.data === "object"
            ? JSON.stringify(error.response.data, null, 2)
            : error.response.data.toString();            
        console.error(
          file,
          "Data:",
          errorData.substring(0, 500) + (errorData.length > 500 ? "..." : "")
        );
      }
    } else if (error.request) {
      console.error(file, "No response received:", error.request);
    }
    return Promise.reject(error);
  }
);

export { client };
