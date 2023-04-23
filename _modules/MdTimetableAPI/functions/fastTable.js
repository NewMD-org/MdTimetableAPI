import fetch from "node-fetch";
import axios from "axios";
import iconv from "iconv-lite";
import { load } from "cheerio";


export async function fastTable(ID, PWD, timeout) {
    try {
        const firstResponse = await fetch(
            "http://140.128.156.92/AACourses/Web/wLogin.php",
            {
                timeout: timeout,
                "method": "GET"
            }
        );
        let firstResponse_setCookie = Object.getOwnPropertySymbols(firstResponse).map(item => firstResponse[item])[1].headers.get("set-cookie");
        let firstResponse_cookie;
        if (firstResponse.status == 200) {
            firstResponse_cookie = firstResponse_setCookie.split(";")[0];
        }
        else {
            throw new Error("fastTable : MD server error");
        }

        const loginResponse = await fetch(
            "http://140.128.156.92/AACourses/Web/wLogin.php",
            {
                timeout: timeout,
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    "cookie": firstResponse_cookie
                },
                body: `sureReg=YES&goURL=qWTT.php&accessWay=ACCOUNT&wRole=STD&stdID=${ID}&stdPWD=${PWD}`,
                method: "POST"
            }
        );
        let loginResponse_cookie;
        if (loginResponse.url === "http://140.128.156.92/AACourses/Web/qWTT.php") {
            loginResponse_cookie = firstResponse_cookie;
        }
        else {
            throw new Error("fastTable : MD server error");
        }

        const getTableResponse = await axios.request(
            {
                timeout: timeout,
                "responseType": "arraybuffer",
                "method": "GET",
                "url": "http://140.128.156.92/AACourses/Web/qWTT.php",
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                    "accept-language": "zh-TW,zh;q=0.9",
                    "cache-control": "max-age=0",
                    "upgrade-insecure-requests": "1",
                    "cookie": loginResponse_cookie
                },
                "transformResponse": [data => {
                    // eslint-disable-next-line no-undef
                    return iconv.decode(Buffer.from(data), "big5");
                }]
            }
        );
        if (getTableResponse.status == 200) {
            const $ = load(getTableResponse.data);
            const location = " > table > tbody > tr > td > span > div > div.";

            if (!$("#UseInfo > table > tbody > tr:nth-child(1) > td > table > tbody > tr > td.WB").text().includes("週課表")) {
                throw new Error("fastTable : MD server error");
            }

            try {
                let year;
                $("#F_sPeriodsem option").each((i, option) => {
                    if (Object.keys($(option).attr()).includes("selected")) {
                        year = $(option).attr().value;
                    }
                });

                let grade = $("#qClass").attr().value;

                let selectedWeek = Number($("head > script:nth-child(19)").html().match(/'getWeekList','(.*?)'\);/)[1]);

                let table = {};
                for (let x = 1; x <= 6; x++) {
                    table[`day${x}`] = {};
                    for (let y = 1; y <= 8; y++) {
                        table[`day${x}`][`${y}`] = {
                            classname: $(`#F_${x}_${y}${location}subj`).html() || "",
                            teacher: $(`#F_${x}_${y}${location}tea`).html() || "",
                            classID: $(`#F_${x}_${y}${location}tea`).html() ? $(`#F_${x}_${y}${location}tea`).attr("onclick").replace(/view_Week_Sec\('|','TEA'\);/gi, "") : "",
                            status: $(`#D_${x}_${y}`).html() || "",
                        };
                    }
                }

                return {
                    year,
                    grade,
                    selectedWeek,
                    table,
                    cookie: loginResponse_cookie
                };
            }
            catch (error) {
                throw new Error("fastTable : Error during getting table");
            }
        }
        else {
            throw new Error("fastTable : MD server error");
        }
    }
    catch (error) {
        throw new Error("fastTable : MD server error");
    }
}