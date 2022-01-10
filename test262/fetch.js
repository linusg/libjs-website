const fetchData = (url) => {
  const headers = new Headers();
  headers.append("pragma", "no-cache");
  headers.append("cache-control", "no-cache");
  return fetch(new Request(url), {
    method: "GET",
    headers,
  });
};
