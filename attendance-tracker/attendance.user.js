// ==UserScript==
// @name         LGSI Attendance Tracker
// @namespace    https://github.com/x445
// @version      2025-05-26
// @description  try to take over the world!
// @author       X445
// @match        http://si-rd10-intdbsr/Attendance/EmpAttendanceReport.aspx
// @updateURL    https://raw.githubusercontent.com/x445ulge/userscripts/refs/heads/main/attendance-tracker/attendance.user.js
// @downloadURL  https://raw.githubusercontent.com/x445ulge/userscripts/refs/heads/main/attendance-tracker/meta.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict'

    // Your code here...
    addEventListener("load", main())

})()

function parseTime(str) {
    return new Date(str)
}

function msToHMS(ms) {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return `${hours.toString().padStart(2, "0")}:` +
        `${minutes.toString().padStart(2, "0")}:` +
        `${seconds.toString().padStart(2, "0")}`
}

function computeAttendance(times) {
    let msActive = 0
    const parsed = times.map(parseTime)

    for (let i = 0; i < parsed.length; i += 2) {
        const start = parsed[i]
        const end = parsed[i + 1]

        if (end) {
            // normal pair
            msActive += end - start
        } else {
            msActive += Date.now() - start
        }
    }

    const totalDelta = Date.now() - parsed[0]

    return {
        active: msToHMS(msActive),
        totalDelta: msToHMS(totalDelta),
        parsedArr: parsed
    }
}

function main() {

    const wfo_times = document.querySelectorAll("#ctl00_ContentPlaceHolder1_GVAttSummary_ctl02_lblWFONeed")
    const target = wfo_times[0].textContent.trim().split(".")
    const actual = wfo_times[1].textContent.trim().split(".")

    const target_ms = parseFloat(target[0]) * 60 * 60 * 1000 + parseFloat(target[1]) * 60 * 1000
    const actual_ms = parseFloat(actual[0]) * 60 * 60 * 1000 + parseFloat(actual[1]) * 60 * 1000
    const balance_ms = actual_ms - target_ms

    const attendance_entries = document.querySelector("#ctl00_ContentPlaceHolder1_GVIRIS").querySelectorAll(".GridRowStyle")
    let times = []

    attendance_entries.forEach((e) => {
        let entries = e.querySelectorAll("span")
        times.push(entries[1].textContent.trim()) // is of type 11/19/2025 12:54:49 PM
    })

    const result = computeAttendance(times)

    // console.log("Active Hours:", result.active)
    // console.log("Total Delta:", result.totalDelta)

    const past_attendance_rows = document.querySelector("#ctl00_ContentPlaceHolder1_GVAttendance").querySelectorAll("tr")

    let total_days = 0
    let total_minutes = 0

    for (let index = 1; index < past_attendance_rows.length; index++) {
        const total_hours_ = past_attendance_rows[index].querySelectorAll("td")[10].textContent.trim().split(":");
        if (total_hours_.length != 2) continue;

        total_days += 1
        total_minutes += parseInt(total_hours_[0]) * 60 + parseInt(total_hours_[1])
    }

    const avg_minutes = total_minutes / total_days
    const avg_hours = Math.floor(avg_minutes / 60)
    const avg_remaining_minutes = Math.floor(avg_minutes % 60)


    const summary_table = document.querySelector("#ctl00_ContentPlaceHolder1_tdSummary")
    const summary = document.createElement('div')

    const target_logout = new Date(result.parsedArr[0].getTime() + 9 * 60 * 60 * 1000 - balance_ms)
    const usual_logout = new Date(result.parsedArr[0].getTime() + 9 * 60 * 60 * 1000)
    const fmt = (t) => { return String(t).padStart(2, '0') }

    summary.innerHTML = `
        <b>Active Hours:</b> <span class="result-active">${result.active}</span>
        <br>
        <b>Total Delta:</b> <span class="result-total-delta">${result.totalDelta}</span>
        <br><br>
        <b>Balance Hours:</b> <span style="color: ${balance_ms < 0 ? "red" : "green"};">${msToHMS(Math.abs(balance_ms))}</span>
        <br>
        <b>Ideal Target for Today:</b> 
            ${fmt(target_logout.getHours() % 12 || 12)}:
            ${fmt(target_logout.getMinutes())}:
            ${fmt(target_logout.getSeconds())} 
            ${target_logout.getHours() >= 12 ? "PM" : "AM"}
        <br>
        <b>Usual 9h Logout:</b> 
            ${fmt(usual_logout.getHours() % 12 || 12)}:
            ${fmt(usual_logout.getMinutes())}:
            ${fmt(usual_logout.getSeconds())} 
            ${usual_logout.getHours() >= 12 ? "PM" : "AM"}
        <br>
        Average Daily Work Time over ${total_days} days: <b>${String(avg_hours).padStart(2, '0')}:${String(avg_remaining_minutes).padStart(2, '0')}</b>
        `

    summary_table.append(summary)

    // dynamic update every second
    setInterval(() => {
        const result = computeAttendance(times)
        document.querySelector('.result-active').textContent = result.active
        document.querySelector('.result-total-delta').textContent = result.totalDelta
    }, 1000)

}