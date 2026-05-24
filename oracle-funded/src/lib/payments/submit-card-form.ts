// Tiny client-side helper: takes the { formUrl, token } returned by
// /api/checkout when method=card and submits an auto-POST form to deliver
// the user to Authorize.net's hosted payment page.

export function submitAuthnetHostedForm(formUrl: string, token: string): void {
  if (typeof document === "undefined") return;

  const form = document.createElement("form");
  form.method = "POST";
  form.action = formUrl;
  // Open in the current tab — same flow as window.location.href on the
  // crypto branch.
  form.target = "_self";

  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "token";
  input.value = token;
  form.appendChild(input);

  document.body.appendChild(form);
  form.submit();
}
