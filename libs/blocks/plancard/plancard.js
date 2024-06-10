/* eslint-disable */
import { createTag, getConfig, loadIms, loadScript, loadStyle } from '../../utils/utils.js';
import {
  getUserProfile,
  lanaLog, toFragment,
} from '../global-navigation/utilities/utilities.js';
import getUserData from './getUserData.js';
import getUserEntitlements from '../global-navigation/utilities/getUserEntitlements.js';

const CARD_TYPES = ['mini-plan-card', 'expanded-plan-card', 'plan-card'];

const queryParams = [
    { name: 'include', value: 'BILLING' },
    { name: 'include', value: 'OFFER.MERCHANDISING' },
    { name: 'include', value: 'OFFER.PRODUCT_ARRANGEMENT' }
  ];

let profileDataSchema = {
  account_type: 'account_type',
  utcOffset: 'null',
  preferred_languages: null,
  displayName: 'display name',
  last_name: 'last_name',
  userId: 'user_id',
  authId: 'auth_id',
  tags: ['edu', 'edu_k12'],
  emailVerified: 'true',
  phoneNumber: null,
  countryCode: 'IN',
  name: 'name',
  mrktPerm: '',
  mrktPermEmail: null,
  first_name: 'first_name',
  email: '',
}

class PlanCard {
  constructor({
    container,
    type
  }) {
    this.container = container;
    this.type = type;
    this.avatarEle = null;
    this.planblocks = {
      profile: {
        avatarEle: toFragment`<div class="plancard-profile-avatar"></div>`,
        profileEle: toFragment`<div class="plancard-profile"></div>`,
        contractTypeEle: toFragment`<div class="plancard-contract-type"></div>`,
        billingIndoEle: toFragment`<div class="plancard-billing-info"></div>`,
        currProdEle: toFragment`<div class="plancard-current-product"></div>`,
        yourCurrProductsEle: toFragment`<p>Your plan includes the following apps and services</p>`,
        productsEle: toFragment`<div class="plancard-products"></div>`,
        subProductsIconItem: toFragment`<div class="plancard-product-item-container"></div>`,
        accessLinkEle: toFragment`<a href="https://stage.creativecloud.adobe.com/apps/"">Access your apps</a>`,
      },
      breadcrumbs: { wrapper: '' },
    };
    this.card;
    this.init();
    this.decorateAvatar();

  }

  init = async () => {
    const { base } = getConfig();

    if(!window.adobeIMS.isSignedInUser()) {
      this.decorateSignedOutExp();
    }
    console.log('getUserData')
    const userData = await getUserData();
    if (userData) {
      profileDataSchema = { ...profileDataSchema, ...userData };
    }
    const subscriptionData = await getUserEntitlements(
      {
        params: queryParams,
        format: 'parsed' // parsed | raw
      });

    this.createPlanCard();
    this.decoratePlancard();
    await this.decorateSubscriptionCard(subscriptionData);
  };

  decorateSignedOutExp() {
    const signedOutExp = document.createElement('div');
    signedOutExp.classList.add('signed-out-exp');
    signedOutExp.innerHTML = `
<div class="plan-card__sections sections--logged-out" daa-level="2" daa-lh="Sign-in Prompt">
  <div>
    <div>
      <div>
        <div>
          <p><span class="dexter-icon dexter-icon-icon-adobe-logo">&nbsp;</span>&nbsp;Adobe</p>
        </div>
      </div>
      <div>
        <div>
          <h2><b>Get help faster and easier</b></h2>
        </div>
      </div>

      <div>
        <div>
          <a onclick="window.adobeIMS.signIn()">Sign in</a>
        </div>
      </div>

      <div>
        <div class="cmp-text">
          <p>New user?</p>
        </div>
      </div>
      <div>
        <div>
          <a onclick="window.adobeIMS.signIn()">Create an account</a>
        </div>
      </div>
    </div>
  </div>
</div>
    `
    document.querySelector('.plancard').appendChild(signedOutExp);
    }

  createPlanCard() {
    this.card = document.createElement('div');
    this.card.classList.add('plan-card-wrapper');
    this.card.appendChild(this.planblocks.profile.profileEle);
    this.card.appendChild(this.planblocks.profile.currProdEle);
    this.card.appendChild(this.planblocks.profile.contractTypeEle);
    this.card.appendChild(this.planblocks.profile.billingIndoEle);
    this.card.appendChild(this.planblocks.profile.productsEle);
    document.querySelector('.plancard')
      .appendChild(this.card);
  }

  decoratePlancard() {
    // decorate profile
    this.decorateProfile();
    // decorate avatar
    this.decorateAvatar()
  }

  decorateProfile() {
    const profileEle = document.querySelector('.plancard-profile');
    profileEle.innerHTML = `
      <div class="plancard-profile-avatar"></div>
      <div class="profile-panel">
        <div class="plancard-profile-name">${profileDataSchema.displayName}</div>
        <div class="manage-profile-link"><a href="https://stage.account.adobe.com/?lang=en">Manage account</a></div>
      </div>
    `;
  }

  async decorateAvatar() {
    const accessToken = window.adobeIMS.getAccessToken();
    const { env } = getConfig();
    const headers = new Headers({ Authorization: `Bearer ${accessToken.token}` });
    const profileData = await fetch(`https://${env.adobeIO}/profile`, { headers });

    if (profileData.status !== 200) {
      return;
    }

    const {
      sections,
      user: { avatar }
    } = await profileData.json();
    let avatarEle = toFragment`<img src=${avatar} alt="avatar">`;

    if (document.querySelector('.plancard-profile-avatar').firstChild) {
      document.querySelector('.plancard-profile-avatar')
        .firstChild
        .remove();
    }
    document.querySelector('.plancard-profile-avatar')
      .appendChild(avatarEle);
  }

  planCardSubscriptionData(subscriptionData) {

  }

  async decorateSubscriptionCard(subscriptionData) {
    let subProductsIconItem = [];
    let subscription = subscriptionData;
    console.log('subscriptionData', subscriptionData);
    const planId = this.getPropertySafely(subscription, 'id');
    const subscriptionId = this.getPropertySafely(subscription, 'contract.id');
    const contractType = this.getOfferProperty(subscription, 'merchandising.misc.plan_type') || 'Creative Cloud Free Membership';
    const organizationId = this.getPropertySafely(subscription, 'contract.organization_id');
    const promoDaysRemaining = this.getPropertySafely(subscription, 'promo_days_remaining');
    const planType = this.getPropertySafely(subscription, 'offer.merchandising.misc.plan_type');
    const icon = this.getPropertySafely(subscription, 'offer.merchandising.assets.icons.48x48');

    let name = this.getOfferProperty(subscription, 'merchandising.copy.name')

    const currentProductEle = document.querySelector('.plancard-current-product');
    currentProductEle.innerHTML = `
      <div class="plancard-current-product-name">${name}</div>
    `;

    const contractTypeEle = document.querySelector('.plancard-contract-type');
    contractTypeEle.innerHTML = `
      <div class="plancard-contract-type-name">${contractType}</div>
    `;

    // decorate product information
    const productsEle = document.querySelector('.plancard-products');
    productsEle.appendChild(this.planblocks.profile.yourCurrProductsEle);
    productsEle.appendChild(this.planblocks.profile.subProductsIconItem);

    let fulfilledItems = this.getOfferProperty(subscription, 'merchandising.fulfillable_items');

    let fulfilledItemscounter = 0;
    if (fulfilledItems) {
      fulfilledItems.forEach((item) => {
        fulfilledItemscounter += 1;
        if(fulfilledItemscounter > 5) return;
        const icon16x16 = this.getPropertySafely(item, 'assets.icons.16x16');
        const itemName = this.getPropertySafely(item, 'code');
        if(itemName.startsWith('cc_')) return;
        if(!icon16x16) return;
        subProductsIconItem.push(
          `<div class="plancard-product-item">
            <img width="26px" height="26px" src=${icon16x16} alt=${itemName}>
          </div>`
        );
      });
    }
    subProductsIconItem.push(`<div class="plancard-product-item button--count">...</div>`);
    document.querySelector('.plancard-product-item-container').innerHTML = subProductsIconItem.join('')
    productsEle.appendChild(this.planblocks.profile.accessLinkEle);
  }

  getPropertySafely(obj, path) {
    return path.split('.')
      .reduce((acc, part) => {
        if (acc && acc[part] !== undefined) {
          return acc[part];
        } else {
          return undefined;
        }
      }, obj);
  }

  getOfferProperty(obj, subPath) {
    const offerId = Object.keys(obj.offers)[0]; // Assuming there is only one offerId, adjust as necessary
    const path = `offers.${offerId}.${subPath}`;
    return this.getPropertySafely(obj, path);
  }

}

export default async function init(config) {
  try {
    await loadIms();
    const planCard = await new PlanCard(config);
    return planCard;
  } catch (e) {
    lanaLog({ message: 'Could not initialize PLANCARD', e, tags: 'errorType=error,module=plancard' });
    return null;
  }
}
