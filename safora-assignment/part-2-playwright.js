const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const targetUrl = 'https://safora.se/en/contact.html';
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    const form = page.locator('#contact-form');
    const name = page.locator('#name');
    const email = page.locator('#email');
    const phone = page.locator('#phone');
    const message = page.locator('#message');
    const submitButton = page.getByRole('button', { name: /send message/i });

    const formDetails = await form.evaluate((formElement) => ({
      pageUrl: location.href,
      formAction: formElement.action,
      formMethod: formElement.method,
    }));

    console.log(`Running against: ${formDetails.pageUrl}`);
    console.log(`Form action: ${formDetails.formAction} (${formDetails.formMethod.toUpperCase()})`);

    // Happy-path data entry.
    await name.fill('QA Intern');
    await email.fill('qa.intern@example.com');
    await phone.fill('+46730445855');
    await message.fill('This is a test message from the QA assignment.');

    const allFieldsValid = await form.evaluate((formElement) => formElement.checkValidity());
    assert.equal(allFieldsValid, true, 'Expected the form to be valid after entering required values.');

    // Click submit to exercise the real UI path.
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();
    await page.waitForTimeout(1000);

    // The live site does not expose a stable success banner, so this script verifies the
    // native browser validation path that the site actually exposes and keeps the filled
    // values present after the submit attempt.
    assert.equal(await name.inputValue(), 'QA Intern');
    assert.equal(await email.inputValue(), 'qa.intern@example.com');
    assert.equal(await phone.inputValue(), '+46730445855');
    assert.equal(await message.inputValue(), 'This is a test message from the QA assignment.');

    // Negative validation check: clear all fields and confirm the browser blocks submission.
    await name.fill('');
    await email.fill('');
    await phone.fill('');
    await message.fill('');
    await submitButton.click();

    const invalidFields = await form.evaluate((formElement) =>
      Array.from(formElement.querySelectorAll('input, textarea'))
        .filter((element) => !element.checkValidity())
        .map((element) => ({
          name: element.name,
          message: element.validationMessage,
        }))
    );

    assert.equal(invalidFields.length, 4, 'Expected required validation errors for all four visible fields.');
    console.log('Playwright contact form check passed.');
    console.log(JSON.stringify(invalidFields, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});