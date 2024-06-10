import { getConfig } from '../../utils/utils.js';

const getUserData = async () => {
  // console.log('insidegetuserdata');
  const profile = await window.adobeIMS.getProfile();
  return profile;
};

export default getUserData;
