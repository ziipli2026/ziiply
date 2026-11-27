// Zoner SMTP over TLS; requires ZIIPLY_SMTP_HOST, ZIIPLY_SMTP_USER,
// ZIIPLY_SMTP_PASSWORD and ZIIPLY_BETA_MAIL_FROM in server environment.
import nodemailer from "nodemailer";
export async function sendBetaLoginEmail({to,loginUrl}) {
  const host=process.env.ZIIPLY_SMTP_HOST;
  const user=process.env.ZIIPLY_SMTP_USER;
  const pass=process.env.ZIIPLY_SMTP_PASSWORD;
  const from=process.env.ZIIPLY_BETA_MAIL_FROM;
  if(!host||!user||!pass||!from) throw new Error("SMTP configuration missing");
  const transport=nodemailer.createTransport({
    host,port:465,secure:true,auth:{user,pass},
    tls:{servername:process.env.ZIIPLY_SMTP_TLS_SERVERNAME||"smtp.zoner.fi",rejectUnauthorized:true},
    connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000
  });
  try {
    await transport.sendMail({
      from,to,subject:"Ziiply – beetakirjautuminen",
      text:`Kirjaudu Ziiplyyn tästä linkistä (voimassa 15 minuuttia):\n\n${loginUrl}\n\nJos et pyytänyt linkkiä, voit jättää viestin huomiotta.`
    });
  } finally {transport.close();}
}
