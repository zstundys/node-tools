
/**  Format date as YYYY-MM ("2024-01") using Intl */
export const yearMonthFormatter = new Intl.DateTimeFormat("lt-LT", {
    year: "numeric",
    month: "2-digit",
});
