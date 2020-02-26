const isUrlInArray = (url, arr) => {
  let cachePath;
  if (url.indexOf(self.origin) === 0) {
    // request targets domain where we serve the page from (i.e. NOT a CDN)
    // take the part of the URL AFTER the domain (e.g. after localhost:8080)
    cachePath = url.substring(self.origin.length);
  } else {
    // store the full request (for CDN s)
    cachePath = url;
  }
  return arr.indexOf(cachePath) > -1;
};

const createFormData = item => {
  const postData = new FormData();
  postData.append('id', item.id);
  postData.append('title', item.title);
  postData.append('location', item.location);
  postData.append('rawLocationLat', item.rawLocation.lat);
  postData.append('rawLocationLng', item.rawLocation.lng);
  postData.append('file', item.picture, item.id + '.png');

  return postData;
};
