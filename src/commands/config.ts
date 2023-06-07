import { Arguments, CommandBuilder } from 'yargs';
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

type Options = {
  filepath: string;
};

export const command: string = 'config <filepath>';

export const builder: CommandBuilder<Options, Options> = (yargs) =>
  yargs.positional('filepath', { type: 'string', demandOption: true });

export const handler = (argv: Arguments<Options>): void => {
  const { filepath } = argv;

  process.stdout.write(`Reading file at ${filepath}\n`);

  // Read file (Fix the any types)
  fs.readFile(filepath, 'utf8', (error: any, data: any) => {
    if (error) {
      console.log(error);
      return;
    }

    const configData = JSON.parse(data);
    const urlRegex = new RegExp(
      `https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)`,
    );

    const scrapeSite = async () => {
      const sites = configData.sites;

      for (const title in sites) {
        console.log(`Scraping ${title}...`);

        const htmlResponse = await axios.get(sites[title].url).catch(function (error: any) {
          console.log(
            `Whoops! Looks like there was an error getting the ${title} html\n`,
            error?.response?.status || '',
          );
        });

        if (htmlResponse?.status === 200) {
          const $ = cheerio.load(htmlResponse.data);

          $(
            `${sites[title]['element_type']}${
              sites[title].container_class ? `[class*="${sites[title].container_class}"] ` : ''
            }`,
          ).each((i: number, element: any) => {
            const obj: any = {};
            sites[title].repeating_exact_classes.forEach((exactClass: any) => {
              obj[exactClass.title] = $(element)
                .find(`${exactClass.element}${exactClass.class_name ? `[class*="${exactClass.class_name}"]` : ''}`)
                .text();
            });

            console.log(obj);
          });
        }
      }
    };

    scrapeSite();
  });
};
