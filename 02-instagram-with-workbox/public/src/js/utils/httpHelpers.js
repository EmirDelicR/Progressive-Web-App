const makeApiCall = async (url, method = 'GET', dataToSend = null) => {
  if (!navigator.onLine) {
    return;
  }
  const BASE_URL = 'https://pwagram-76764.firebaseio.com/';
  const CONFIG = {
    method
    // headers: {
    //   'Content-Type': 'application/json',
    //   Accept: 'application/json'
    // }
  };

  if (method !== 'GET' && dataToSend !== null) {
    CONFIG.body = JSON.stringify(dataToSend);
  }

  try {
    const rawData = await fetch(`${BASE_URL}${url}.json`, CONFIG);
    const data = await rawData.json();
    return data;
  } catch (err) {
    console.log('Api call failed: ', err);
  }
};
