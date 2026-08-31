import httpntlm from "httpntlm";

const postSoapRequest = ({ url, username, password, body, soapAction }) =>
  new Promise((resolve, reject) => {
    httpntlm.post(
      {
        url,
        username,
        password,
        body,
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: soapAction,
        },
      },
      (error, response) => {
        if (error) {
          reject(error);
          return;
        }

        const statusCode = response?.statusCode ?? 0;
        const responseBody = response?.body ?? "";

        if (statusCode >= 400) {
          const err = new Error(
            `SOAP NAV gagal (${statusCode}): ${responseBody.slice(0, 500)}`,
          );
          err.statusCode = statusCode;
          err.responseBody = responseBody;
          reject(err);
          return;
        }

        resolve({
          statusCode,
          body: responseBody,
        });
      },
    );
  });

export const callSoapNav = async ({
  endpoint,
  usernameNTLM,
  passwordNTLM,
  soapAction,
  xmlBody,
  timeoutMs = 30000,
}) => {
  if (!endpoint) throw new Error("SOAP endpoint belum dikonfigurasi");
  if (!usernameNTLM || !passwordNTLM) {
    throw new Error("Kredensial NTLM SOAP belum dikonfigurasi");
  }
  if (!soapAction) throw new Error("SOAPAction belum dikonfigurasi");
  if (!xmlBody) throw new Error("Body SOAP kosong");

  const requestPromise = postSoapRequest({
    url: endpoint,
    username: usernameNTLM,
    password: passwordNTLM,
    body: xmlBody,
    soapAction,
  });

  if (!timeoutMs || timeoutMs <= 0) {
    return requestPromise;
  }

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`SOAP NAV timeout setelah ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([requestPromise, timeoutPromise]);
};

export const extractXmlTagValue = (xml, tagName) => {
  if (!xml || !tagName) return null;
  const regex = new RegExp(`<(?:\\w+:)?${tagName}[^>]*>([^<]*)</(?:\\w+:)?${tagName}>`, "i");
  const match = xml.match(regex);
  return match?.[1]?.trim() ?? null;
};

export default callSoapNav;
