"use strict";
const aws4 = require('hyper-aws4');
const fetch = require('node-fetch');
const Promise = require('bluebird');
const Handlebars = require('handlebars');
const spawn = require('child_process').spawn;
const fs = require('mz/fs');

let configTemplate = Handlebars.compile(`
{{#each services}}
{{{url}}} {
    proxy / {{#backends}}{{.}}{{/backends}} {
        transparent
        websocket
    }
}
{{/each}}
`);

let configPath = `${__dirname}/Caddyfile`;

update().then(() => {

  let caddy = spawnCaddy();

  setInterval(() => {
    update().then((updated) => {
      if(updated) {
        caddy.kill('SIGUSR1')
        console.log('config updated')
      }
    });
  }, 60 * 1000);

})


function spawnCaddy() {
  let caddyArgs = ["-conf", configPath]
  if(process.env.LETSENCRYPT_EMAIL) {
    caddyArgs.push("-agree", "-email", process.env.LETSENCRYPT_EMAIL)
  }
  let caddy = spawn('caddy', caddyArgs);

  caddy.stdout.on('data', (data) => {
    console.log(data.toString());
  });

  caddy.stderr.on('data', (data) => {
    console.error(data.toString());
  });

  caddy.on('close', process.exit);

  return caddy;
}

function update() {

  let containers = fetchJSON('/containers/json');

  let infos = containers.then((containers) => {
      return Promise.all(containers.map(container => {
        return fetchJSON(`/containers/${container.Id}/json`);
      }));
  })

  let services = Promise.join(containers, infos, (containers, infos) => {

    let services = {};

    infos.map((info, i) => {

      let vhost = info.Config.Env.find((item) => item.indexOf('VIRTUAL_HOST') > -1)

      if(!vhost) { return; }

      vhost = vhost.replace('VIRTUAL_HOST=','')
      let url = info.NetworkSettings.IPAddress + ':' + containers[i].Ports[0].PublicPort

      if (services[vhost]) {
        services[vhost].backends.push(url)
      } else {
        services[vhost] = {
          url: vhost,
          backends: [url]
        }
      }
    })

    return services;
  })

  let config = fs.readFile(configPath);

  return Promise.join(services, config, (services, config) => {
    let newConfig = configTemplate({services: services});
    if(config != newConfig) {
      fs.writeFileSync(configPath, newConfig);
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  });
}

function fetchJSON(endpoint) {
  const signOption = {
    url: 'https://us-west-1.hyper.sh' + endpoint,
    method: 'GET',
    credential: {
      accessKey: process.env.HYPER_ACCESS,
      secretKey: process.env.HYPER_SECRET
    }
  };
  const headers = aws4.sign(signOption)

  return fetch(signOption.url, {method: signOption.method, headers}).then((res) => {
    return res.json()
  });
}