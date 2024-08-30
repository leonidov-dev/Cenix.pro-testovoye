import puppeteer from 'puppeteer';
import fs from 'fs';

// Получение параметров командной строки
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node index.js <URL> <Region>');
    process.exit(1);
}

const [url, regionToSelect] = args;

(async () => {
    const browser = await puppeteer.launch({ headless: false }); // Отключаем headless режим для визуальной проверки
    const page = await browser.newPage();

    try {
        // Переход на страницу товара
        await page.goto(url);

        // Установка размера окна браузера
        await page.setViewport({ width: 1920, height: 1080 });

        // Ждем появления кнопки выбора региона и логируем
        await page.waitForSelector('.Region_region__6OUBn', { visible: true });
        console.log('Кнопка выбора региона найдена и видима.');
        await new Promise((resolve, reject) => setTimeout(resolve, 3000));
        // Кликаем по кнопке и логируем
        const regionBtn = await page.$('.Region_region__6OUBn');
        if (regionBtn) {
            await regionBtn.click();
            console.log('Клик по кнопке выбора региона произведен.');

            // Ожидаем открытия окна выбора региона и логируем
            await page.waitForSelector('.UiRegionListBase_item___ly_A', { visible: true });
            console.log('Окно выбора региона открылось.');

            // Получаем список регионов и кликаем по нужному
            const regionsList = await page.$$('.UiRegionListBase_item___ly_A');
            for (const item of regionsList) {
                const regionText = await page.evaluate(el => el.textContent, item);
                if (regionText.includes(regionToSelect)) {
                    await item.click();
                    console.log(`Выбран регион: ${regionToSelect}`);
                    break;
                }
            }

            // Ждем обновления страницы после выбора региона
            await new Promise((resolve, reject) => setTimeout(resolve, 3000)); 

            // Делаем скриншот страницы после выбора региона
            await page.screenshot({ path: 'screenshot.jpg', fullPage: true });
            console.log('Скриншот сохранен как screenshot.jpg');

            // Извлечение данных
            const rating = await page.evaluate(() => {
                const ratingElement = document.querySelector('.ActionsRow_stars__EKt42');
                return ratingElement ? ratingElement.getAttribute('title').replace('Оценка: ', '') : 'Не найдено';
            });

            const reviewsCount = await page.evaluate(() => {
                const reviewsElement = document.querySelector('.ActionsRow_reviews__AfSj_');
                return reviewsElement ? reviewsElement.textContent.trim() : 'Не найдено';
            });

            const [oldPrice, currentPrice] = await page.evaluate(() => {
                const oldPriceElement = document.querySelector('.PriceInfo_oldPrice__IW3mC .Price_price__QzA8L');
                const currentPriceElement = document.querySelector('.Price_price__QzA8L.Price_role_discount__l_tpE');
                return [
                    oldPriceElement ? oldPriceElement.textContent.trim() : 'Не найдено',
                    currentPriceElement ? currentPriceElement.textContent.trim() : 'Не найдено'
                ];
            });

            console.log(rating);
            console.log(reviewsCount);
            console.log(oldPrice, currentPrice);

            // Запись данных в текстовый файл
            const data = `Рейтинг: ${rating}
            Количество отзывов: ${reviewsCount}
            Старая цена: ${oldPrice}
            Текущая цена: ${currentPrice} `;
            fs.writeFileSync('product_info.txt', data.trim());
            console.log('Данные сохранены в product_info.txt');

        } else {
            console.error('Кнопка выбора региона не найдена.');
        }
    } catch (error) {
        console.error('Произошла ошибка:', error);
    } finally {
        // Закрываем браузер
        await browser.close();
    }
})();
