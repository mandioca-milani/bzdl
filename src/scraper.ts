import * as _ from 'lodash'
import { JsonDB } from 'node-json-db'
import { Config } from 'node-json-db/dist/lib/JsonDBConfig'
import * as puppeteer from "puppeteer"


class Scraper {
    static browser: puppeteer.Browser
    static page: puppeteer.Page
    static cookiesDB: JsonDB

    static async build(): Promise<Scraper> {
        Scraper.browser = await puppeteer.launch({ headless: false })
        Scraper.page = await Scraper.browser.newPage()
        Scraper.cookiesDB = new JsonDB(new Config('data/cookies', true, true))
        return new Scraper()
    }

    async login(email: string, password: string): Promise<boolean> {
        if (await this.logged()) {
            await this.logout()
        }

        if (Scraper.page.url() != 'https://promilitares.com.br/login') {
            await Scraper.page.goto('https://promilitares.com.br/login')
        }

        await Scraper.page.type('input[name="_username"]', email)
        await Scraper.page.type('input[name="_password"]', password)

        await Promise.all([
            Scraper.page.click('button[type="submit"]'),
            Scraper.page.waitForNavigation()
        ])

        if (Scraper.page.url() == 'https://promilitares.com.br/cursos') {
            Scraper.cookiesDB.push('/cookies', await Scraper.page.cookies())
            return true
        }

        return false
    }

    async logout(): Promise<void> {
        if (!await this.logged()) {
            return
        }

        if (Scraper.page.url() != 'https://promilitares.com.br/cursos') {
            await Scraper.page.goto('https://promilitares.com.br/cursos')
        }

        if (await Scraper.page.$('div[class="item-logado usuario"]')) {
            await Scraper.page.click('div[class="item-logado usuario"]')
            await Promise.all([
                Scraper.page.click('a[href="/logout"]'),
                Scraper.page.waitForNavigation()
            ])
        }

        Scraper.cookiesDB.push('/cookies', [])
    }

    async logged() {
        try {
            if (!Scraper.cookiesDB.getData('/cookies').length) {
                return false
            }

            if (_.isEqual(await Scraper.page.cookies(), Scraper.cookiesDB.getData('/cookies'))) {
                return true
            }

            await Scraper.page.setCookie(...Scraper.cookiesDB.getData('/cookies'))
        } catch {
            Scraper.cookiesDB.push('/cookies', [])
            return false
        }

        await Scraper.page.goto('https://promilitares.com.br/cursos')

        if (await Scraper.page.$('div[class="item-logado usuario"]')) {
            return true
        }

        Scraper.cookiesDB.push('/cookies', [])
        return false
    }
}
