import { BrowserProvider } from 'ethers';
import { SiweMessage } from 'siwe';

const domain = window.location.host;
const origin = "http://localhost:4200/v/login";
const provider = new BrowserProvider(window.ethereum);

const BACKEND_ADDR = "http://localhost:3000";
async function createSiweMessage(address, statement) {
    const res = await fetch(`${BACKEND_ADDR}/nonce`, {
        credentials: 'include',
    });

    const now = new Date();
    const minutes_15_in_seconds = 15 * 60 * 1000;
    const message = new SiweMessage({
        // NOTE: for some reason, the "scheme" field breaks a parsing on the backend side.
        // scheme,
        domain,
        address,
        statement,
        uri: origin,
        version: '1',
        chainId: (await provider.getNetwork()).chainId,
        nonce: await res.text(),
        issuedAt: now.toISOString(),
        expirationTime: new Date(now.getTime() + minutes_15_in_seconds).toISOString(),
    });
    return message.prepareMessage();
}

function connectWallet() {
    provider.send('eth_requestAccounts', [])
        .catch(() => console.log('user rejected request'));
}

async function signInWithEthereum() {
    const signer = await provider.getSigner();

    const message = await createSiweMessage(
        await signer.getAddress(),
      'By signing, you are proving you own this wallet and logging in. This does not initiate a transaction or cost any fees.'
    );
    const signature = await signer.signMessage(message);

    console.log(`message:\n${message}\n`);

    console.log('GQL request body (for copy&paste):');
    console.log(`
mutation {
  auth {
    login(
      loginMethod: "web3-wallet"
      loginCredentialsJson: ${JSON.stringify(JSON.stringify({ message, signature }))}
    ) {
      accessToken
    }
  }
}
    `);

    const res = await fetch(`${BACKEND_ADDR}/verify`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, signature }),
        credentials: 'include'
    });
    console.log(await res.text());
}

async function getInformation() {
    const res = await fetch(`${BACKEND_ADDR}/personal_information`, {
        credentials: 'include',
    });
    console.log(await res.text());
}

const connectWalletBtn = document.getElementById('connectWalletBtn');
const siweBtn = document.getElementById('siweBtn');
const infoBtn = document.getElementById('infoBtn');
connectWalletBtn.onclick = connectWallet;
siweBtn.onclick = signInWithEthereum;
infoBtn.onclick = getInformation;
