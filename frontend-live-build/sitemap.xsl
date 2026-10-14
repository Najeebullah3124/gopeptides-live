<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" 
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>XML Sitemap</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style type="text/css">
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif; color: #333; margin: 0; padding: 40px; background-color: #f9f9fa; }
          #container { max-width: 960px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
          h1 { font-size: 24px; font-weight: 600; margin-top: 0; color: #1a1a1a; }
          p { font-size: 14px; line-height: 1.6; color: #555; }
          a { color: #0066cc; text-decoration: none; }
          a:hover { text-decoration: underline; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
          th { background-color: #f1f1f1; text-align: left; padding: 12px 15px; font-weight: 600; color: #333; border-bottom: 2px solid #ddd; }
          td { padding: 12px 15px; border-bottom: 1px solid #eee; }
          tr:hover td { background-color: #f9f9f9; }
          .meta { margin-bottom: 30px; padding: 15px; background: #eef5fc; border-left: 4px solid #0066cc; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div id="container">
          <h1>XML Sitemap</h1>
          <div class="meta">
            <p>
              Deze XML sitemap is gegenereerd door het GoPeptides systeem. Het is wat zoekmachines zoals Google gebruiken om berichten/pagina's/producten/afbeeldingen/archieven op je site te crawlen en opnieuw te crawlen.
            </p>
            <xsl:if test="sitemap:sitemapindex">
              <p>Dit XML sitemap Index bestand bevat <strong><xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/></strong> sitemaps.</p>
            </xsl:if>
            <xsl:if test="sitemap:urlset">
              <p>Dit XML sitemap bestand bevat <strong><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></strong> URLs.</p>
            </xsl:if>
          </div>
          
          <xsl:if test="sitemap:sitemapindex">
            <table>
              <thead>
                <tr>
                  <th>Sitemap</th>
                  <th>Laatst gewijzigd</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
                  <tr>
                    <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                    <td>
                      <xsl:if test="sitemap:lastmod">
                        <xsl:value-of select="concat(substring(sitemap:lastmod,0,11),concat(' ', substring(sitemap:lastmod,12,5)),concat(' ', substring(sitemap:lastmod,20,6)))"/>
                      </xsl:if>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </xsl:if>

          <xsl:if test="sitemap:urlset">
            <table>
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Prioriteit</th>
                  <th>Wijzigingsfrequentie</th>
                  <th>Laatst gewijzigd</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <tr>
                    <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                    <td><xsl:value-of select="sitemap:priority"/></td>
                    <td><xsl:value-of select="sitemap:changefreq"/></td>
                    <td>
                      <xsl:if test="sitemap:lastmod">
                        <xsl:value-of select="concat(substring(sitemap:lastmod,0,11),concat(' ', substring(sitemap:lastmod,12,5)),concat(' ', substring(sitemap:lastmod,20,6)))"/>
                      </xsl:if>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </xsl:if>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
