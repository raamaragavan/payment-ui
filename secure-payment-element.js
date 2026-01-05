
class SecurePaymentElement extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this.state = {};
  }

  connectedCallback() {
    this.render();
    this.bindEvents();
  }

  render() {
    this._shadow.innerHTML = `
<style>
/* =====================================================
   LIGHT THEME (DEFAULT)
===================================================== */
:host {
  --payment-bg: #ffffff;
  --payment-text: #333333;
  --payment-input-bg: #ffffff;
  --payment-input-border: #cccccc;
  --payment-input-focus: #4A90E2;
  --payment-button-bg: #4A90E2;
  --payment-button-hover: #357ABD;
  --payment-button-text: #ffffff;
  --payment-success-bg: #DFF2BF;
  --payment-success-text: #4F8A10;
  --payment-failure-bg: #FFBABA;
  --payment-failure-text: #D8000C;
  --payment-font: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;

  display: block;
  font-family: var(--payment-font);
  max-width: 350px;
  margin: 1rem auto;
  padding: 1.5rem;
  border-radius: 12px;
  background-color: var(--payment-bg);
  color: var(--payment-text);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  cursor: default;
}

/* =====================================================
   DARK THEME (PASSED VIA ATTRIBUTE)
   <secure-payment-element theme="dark">
===================================================== */
:host([theme="dark"]) {
  --payment-bg: #0f172a;
  --payment-text: #e5e7eb;
  --payment-input-bg: #020617;
  --payment-input-border: #334155;
  --payment-input-focus: #60a5fa;
  --payment-button-bg: #2563eb;
  --payment-button-hover: #1d4ed8;
  --payment-button-text: #ffffff;
  --payment-success-bg: #052e16;
  --payment-success-text: #86efac;
  --payment-failure-bg: #450a0a;
  --payment-failure-text: #f87171;
display: block;
  font-family: var(--payment-font);
  max-width: 350px;
  margin: 1rem auto;
  padding: 1.5rem;
  border-radius: 12px;
  background-color: var(--payment-bg);
  color: var(--payment-text);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  cursor: default;
}

/* =====================================================
   COMMON STYLES (UNCHANGED)
===================================================== */
h2 {
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: 1rem;
}

input {
  display: block;
  width: 100%;
  padding: 12px 15px;
  margin-bottom: 12px;
  border-radius: 8px;
  border: 1px solid var(--payment-input-border);
  font-size: 1rem;
  background-color: var(--payment-input-bg);
  color: var(--payment-text);
}

input:focus {
  outline: none;
  border-color: var(--payment-input-focus);
  box-shadow: 0 0 6px rgba(96,165,250,0.4);
}

button {
  width: 100%;
  padding: 12px;
  background-color: var(--payment-button-bg);
  color: var(--payment-button-text);
  font-size: 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover:not(:disabled) {
  background-color: var(--payment-button-hover);
}

button:disabled {
  background-color: #6b7280;
  color: #e5e7eb;
  cursor: not-allowed;
  opacity: 0.6;
}

#status {
  margin-top: 12px;
  padding: 10px;
  border-radius: 6px;
  font-size: 0.95rem;
  text-align: center;
  opacity: 0;
  transform: translateY(-5px);
  transition: all 0.3s ease;
}

.success {
  background-color: var(--payment-success-bg);
  color: var(--payment-success-text);
  opacity: 1;
  transform: translateY(0);
}

.error {
  color: var(--payment-failure-text);
  opacity: 1;
  transform: translateY(0);
}
</style>

      </style>

      <form aria-labelledby="payment-title">
        <h2 id="payment-title">Payment Details</h2>

        <label>
          Card Number
          <input id="card" inputmode="numeric" aria-required="true" aria-describedby="card-error" />
          <div class="error" id="card-error"></div>
        </label>

        <label>
          Expiration (MM/YY)
          <input id="expiry" placeholder="MM/YY" aria-required="true" aria-describedby="expiry-error" />
          <div class="error" id="expiry-error"></div>
        </label>

        <label>
          CVC
          <input id="cvc" type="password" aria-required="true" aria-describedby="cvc-error" />
          <div class="error" id="cvc-error"></div>
        </label>

        <label>
          Postal Code
          <input id="postal" aria-required="true" aria-describedby="postal-error" />
          <div class="error" id="postal-error"></div>
        </label>

        <button id="pay" disabled>Pay</button>

        <div id="status" role="alert" aria-live="assertive"></div>
      </form>
    `;

    this._shadow
      .getElementById('pay')
      .addEventListener('click', () => this.submit());
  }

  bindEvents() {
    const fields = ['card', 'expiry', 'cvc', 'postal'];
    fields.forEach(id => {
      const fieldId = this._shadow.getElementById(id);
      fieldId
        .addEventListener('input', () => {
          if (id === 'card') {
            this.cardValidation()
          }
          if (id === 'expiry') {
            this.expiryValidation();
          }
          if (id === 'cvc') {
            this.cvcValidation();
          }
          if (id === 'postal') {
            this.postalValidation();
          }
        }
        )
      fieldId.addEventListener('blur', () => {
        if (this.cardValid && this.expiryValid && this.cvcValid && this.postalValid) {
          this._shadow.getElementById('pay').disabled = false;
        } else {
          this._shadow.getElementById('pay').disabled = true;
        }
      }
      )
    }

    );
  }


  // Remove all non-digits
  normalizeCardNumber(value) {
    return value.replace(/\D/g, '');
  }

  // Format as 1234 5678 9012 3456
  formatCardNumber(value) {
    return this.normalizeCardNumber(value)
      .substring(0, 16)
      .replace(/(.{4})/g, '$1 ')
      .trim();
  }

  // Mask: **** **** **** 1234
  maskCardNumber(value) {
    const digits = this.normalizeCardNumber(value);
    if (digits.length < 4) return '****';
    return '**** **** **** ' + digits.slice(-4);
  }

  // Luhn algorithm
  luhnCheck(cardNumber) {
    let sum = 0;
    let doubleDigit = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i], 10);

      if (doubleDigit) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      doubleDigit = !doubleDigit;
    }
    return sum % 10 === 0;
  }

  cardValidation() {
    const cardInput = this._shadow.getElementById('card');
    cardInput.addEventListener('input', e => {
      const raw = this.normalizeCardNumber(e.target.value);
      e.target.value = this.formatCardNumber(raw);

      this.cardValid =
        raw.length === 16;
      console.log(raw.length, this.luhnCheck(raw))
      this.showValidation(
        'card',
        this.cardValid,
        'Invalid card number. it should be 16 digits'
      );
    });
  }

  expiryValidation() {
    const expiryInput = this._shadow.getElementById('expiry');
    expiryInput.addEventListener('input', e => {
      let value = e.target.value.replace(/[^\d/]/g, '');

      // Auto-insert slash
      if (value.length === 2 && !value.includes('/')) {
        value += '/';
      }

      e.target.value = value.substring(0, 5);
      this.expiryValid = this.validateExpiry(e.target.value);
      this.showValidation(
        'expiry',
        this.expiryValid,
        'Invalid expiry date'
      );
    });
  }

  validateExpiry(value) {
    // Must be exactly MM/YY
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(value)) {
      return false;
    }

    const [mm, yy] = value.split('/');
    const month = Number(mm);
    const year = 2000 + Number(yy);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Expired card check
    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;

    return true;
  }

  cvcValidation() {
    const cvcInput = this._shadow.getElementById('cvc');
    cvcInput.addEventListener('input', e => {
      this.cvcValid = this.validateCVC(e.target.value);
      this.showValidation(
        'cvc',
        this.cvcValid,
        'Invalid cvc number. Enter three digit cvc'
      );
    });
  }


  postalValidation() {
    const postalInput = this._shadow.getElementById('postal');
    postalInput.addEventListener('input', e => {
      this.postalValid = this.validatePostalCode(e.target.value);
      this.showValidation(
        'postal',
        this.postalValid,
        'Invalid postal number. it should be 5 digits'
      );
    });
  }


  // CVC: exactly 3 digits
  validateCVC(value) {
    return /^\d{3}$/.test(value);
  }

  // Postal Code (US default)
  validatePostalCode(value) {
    return /^\d{5}(-\d{4})?$/.test(value);
  }

  showValidation(field, condition, message) {
    const input = this._shadow.getElementById(field);
    const error = this._shadow.getElementById(`${field}-error`);

    if (!condition) {
      input.classList.add('invalid');
      error.textContent = message;
      input.setAttribute('aria-invalid', 'true');
      return false;
    }

    input.classList.remove('invalid');
    error.textContent = '';
    input.setAttribute('aria-invalid', 'false');
    return true;
  }

  simpleHash(str) {
    let hash = 2166136261;

    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash +=
        (hash << 1) +
        (hash << 4) +
        (hash << 7) +
        (hash << 8) +
        (hash << 24);
    }

    return (hash >>> 0).toString(16);
  }

  generateDummyToken(payload) {
    const safeData = [
      payload.card.slice(-4),  // last 4 only
      payload.exp,
      payload.cvc,
      payload.postal,
      new Date()       // makes token single-use-ish
    ].join('|');
    console.log('safeData', safeData);
    const hash = this.simpleHash(safeData);
    console.log('hash', hash);
    return `tok_${hash}`;
  }

  async submit() {
    const card = this._shadow.getElementById('card').value;
    const exp = this._shadow.getElementById('expiry').value;
    const cvc = this._shadow.getElementById('cvc').value;
    const postal = this._shadow.getElementById('postal').value;
    const payload = { card, exp, cvc, postal };

    try {
      const token = this.generateDummyToken(payload)
      alert("Token generated"+token);
      // Wipe sensitive data immediately
      ['card', 'expiry', 'cvc', 'postal'].forEach(id =>
        this._shadow.getElementById(id).value = ''
      );

      if (token) {
        this.dispatchEvent(
          new CustomEvent('payment-tokenized', {
            detail: { token },
            bubbles: true,
            composed: true
          })
        );
      }
    } catch (e) {
      this.dispatchEvent(new CustomEvent('payment-error', {
        detail: 'Payment error',
        bubbles: true,
        composed: true
      }));
    }

  }
}

customElements.define('secure-payment-element', SecurePaymentElement);
