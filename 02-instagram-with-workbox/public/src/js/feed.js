/************************ Cache the DOM **********************************/
const shareImageButton = document.querySelector('#share-image-button');
const createPostArea = document.querySelector('#create-post');
const closeCreatePostModalButton = document.querySelector(
  '#close-create-post-modal-btn'
);
const sharedMomentsArea = document.querySelector('#shared-moments');

/** Form Input */
const form = document.querySelector('form');
const titleInput = document.querySelector('#title');
const locationInput = document.querySelector('#location');
/** For video and img capture */
const videoPlayer = document.querySelector('#player');
const canvasElement = document.querySelector('#canvas');
const captureButton = document.querySelector('#capture-btn');
const imagePicker = document.querySelector('#image-picker');
const imagePickerArea = document.querySelector('#pick-image');
let picture;
// For geolocation
const locationBtn = document.querySelector('#location-btn');
const locationLoader = document.querySelector('#location-loader');
let fetchedLocation = { lat: 0, lng: 0 };

/************************ Functions for UI manipulation ******************************/
const togglePostModal = (status = 'none') => {
  createPostArea.style.display = status;
  let translateYOption = '100vh';
  mediaCleanUp();
  if (status === 'block') {
    translateYOption = '0';
    initializeMedia();
    initializeLocation();
  }

  setTimeout(() => {
    createPostArea.style.transform = `translateY(${translateYOption})`;
  }, 1);
};

const createCard = data => {
  const cardWrapper = document.createElement('div');
  cardWrapper.className = 'shared-moment-card mdl-card mdl-shadow--2dp';

  const cardTitle = document.createElement('div');
  cardTitle.className = 'mdl-card__title';
  cardTitle.style.backgroundImage = 'url(' + data.image + ')';
  cardTitle.style.backgroundSize = 'cover';
  cardWrapper.appendChild(cardTitle);

  const cardTitleTextElement = document.createElement('h2');
  cardTitleTextElement.style.color = 'white';
  cardTitleTextElement.className = 'mdl-card__title-text';
  cardTitleTextElement.textContent = data.title;
  cardTitle.appendChild(cardTitleTextElement);

  const cardSupportingText = document.createElement('div');
  cardSupportingText.className = 'mdl-card__supporting-text';
  cardSupportingText.textContent = data.location;
  cardSupportingText.style.textAlign = 'center';
  cardSupportingText.style.color = 'black';
  cardWrapper.appendChild(cardSupportingText);

  // componentHandler.upgradeElement(cardWrapper);
  sharedMomentsArea.appendChild(cardWrapper);
};

/******************************** Geo Location function *************************/
const initializeLocation = () => {
  if (!('geolocation' in navigator)) {
    locationBtn.style.display = 'none';
  }
};

/******************************** Media helper functions ************************/
const stopVideoPlayer = () => {
  if (videoPlayer && videoPlayer.srcObject) {
    videoPlayer.srcObject.getVideoTracks().forEach(track => {
      track.stop();
    });
  }
};

const mediaCleanUp = () => {
  stopVideoPlayer();
  imagePickerArea.style.display = 'none';
  videoPlayer.style.display = 'none';
  canvasElement.style.display = 'none';
  locationBtn.style.display = 'inline';
  locationLoader.style.display = 'none';
  captureButton.style.display = 'inline';
};

const initializeMedia = () => {
  if (!('mediaDevices' in navigator)) {
    /* create an polyfill if mediaDevice is not supported */
    navigator.mediaDevices = {};
  }

  if (!('getUserMedia' in navigator.mediaDevices)) {
    navigator.mediaDevices.getUserMedia = constraints => {
      const getUserMedia =
        navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented!'));
      }

      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }
  /**  we can pass audio:true to object also **/
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then(stream => {
      videoPlayer.srcObject = stream;
      videoPlayer.style.display = 'block';
    })
    .catch(err => {
      /** Show image picker fallback */
      imagePickerArea.style.display = 'block';
    });
};

/******************************** Logic helper functions ************************/
const createFormDataWithoutId = () => {
  const id = new Date().toISOString();
  const postData = new FormData();
  postData.append('id', id);
  postData.append('title', titleInput.value);
  postData.append('location', locationInput.value);
  postData.append('rawLocationLat', fetchedLocation.lat);
  postData.append('rawLocationLng', fetchedLocation.lng);
  postData.append('file', picture, id + '.png');

  return postData;
};

const sendData = async () => {
  const postData = createFormDataWithoutId();
  const data = await makeApiCall('posts', 'POST', postData);
  updateUI();
};

/******************************** Register events *******************************/
shareImageButton.addEventListener('click', () => togglePostModal('block'));
closeCreatePostModalButton.addEventListener('click', () => togglePostModal());

form.addEventListener('submit', event => {
  event.preventDefault();

  if (titleInput.value.trim() === '' || locationInput.value.trim() === '') {
    alert('Input valid data');
    return;
  }

  togglePostModal();

  /** Do Background Sync */
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then(sw => {
      const post = {
        id: new Date().toISOString(),
        title: titleInput.value,
        location: locationInput.value,
        picture: picture,
        rawLocation: fetchedLocation
      };

      writeDate('sync-posts', post)
        .then(() => {
          return sw.sync.register('sync-new-posts');
        })
        .then(() => {
          const snackbarContainer = document.querySelector(
            '#confirmation-toast'
          );
          const data = { message: 'Your Post was save saved for syncing!' };
          snackbarContainer.MaterialSnackbar.showSnackbar(data);
        })
        .catch(err => {
          console.log(err);
        });
    });
  } else {
    sendData();
  }
});

captureButton.addEventListener('click', event => {
  canvasElement.style.display = 'block';
  videoPlayer.style.display = 'none';
  captureButton.style.display = 'none';
  const context = canvasElement.getContext('2d');
  context.drawImage(
    videoPlayer,
    0,
    0,
    canvas.width,
    videoPlayer.videoHeight / (videoPlayer.videoWidth / canvas.width)
  );
  stopVideoPlayer();
  picture = dataURItoBlob(canvasElement.toDataURL());
});

imagePicker.addEventListener('change', event => {
  picture = event.target.files[0];
});

locationBtn.addEventListener('click', event => {
  if (!('geolocation' in navigator)) {
    return;
  }

  let sawAlert = false;

  locationBtn.style.display = 'none';
  locationLoader.style.display = 'block';

  navigator.geolocation.getCurrentPosition(
    position => {
      locationBtn.style.display = 'inline';
      locationLoader.style.display = 'none';
      fetchedLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      locationInput.value = 'In Some City';
      document.querySelector('#manual-location').classList.add('is-focused');
    },
    err => {
      console.log(err);
      locationBtn.style.display = 'inline';
      locationLoader.style.display = 'none';

      if (!sawAlert) {
        sawAlert = true;
        alert("Couldn't fetch location, pleas enter manually!");
      }
      fetchedLocation = { lat: 0, lng: 0 };
    },
    { timeout: 10000 }
  );
});

/*************************************** UI manipulation *************************/
const clearCards = () => {
  while (sharedMomentsArea.hasChildNodes()) {
    sharedMomentsArea.removeChild(sharedMomentsArea.lastChild);
  }
};

const updateUI = data => {
  clearCards();
  data.forEach(element => {
    createCard(element);
  });
};

/** Make mock api call */

const mock = async () => {
  // const data = await makeApiCall('posts');
  const mockData = [
    {
      image: '/src/images/main-image-sm.jpg',
      title: 'My Dummy image',
      location: 'Together we maid it!'
    }
  ];
  updateUI(mockData);
};

mock();

/*************************** Read data from indexed DB ******************************/
const mockDB = () => {
  if ('indexedDB' in window) {
    readAllData('posts').then(data => {
      console.log('From INDEXED_DB: ', data);
      // updateUI(data);
    });
  }
};

mockDB();
