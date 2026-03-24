"""Blocklist of known disposable / throwaway email domains."""

DISPOSABLE_DOMAINS = {
    # Mailinator family
    "mailinator.com", "mailinator2.com", "mailinater.com", "suremail.info",
    "spamgourmet.com", "spamgourmet.net", "spamgourmet.org",
    # Guerrilla Mail
    "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
    "guerrillamail.biz", "guerrillamail.de", "guerrillamail.info",
    "guerrillamailblock.com", "spam4.me",
    # Temp-mail / 10min
    "temp-mail.org", "temp-mail.ru", "tempmail.com", "tempmail.net",
    "tempmail.de", "10minutemail.com", "10minutemail.net", "10minutemail.org",
    "10minemail.com", "10minutemail.co.za", "10minutemail.us",
    "throwam.com", "throwam.net",
    # Yopmail
    "yopmail.com", "yopmail.fr", "cool.fr.nf", "jetable.fr.nf",
    "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj", "speed.1s.fr",
    "courriel.fr.nf", "moncourrier.fr.nf", "monemail.fr.nf", "monmail.fr.nf",
    # Sharklasers / Guerrilla variants
    "sharklasers.com", "guerrillamailblock.com", "grr.la", "guerrillamail.info",
    "spam4.me", "trashmail.at",
    # Trashmail
    "trashmail.com", "trashmail.me", "trashmail.net", "trashmail.org",
    "trashmail.io", "trashmail.xyz", "trashmail.at",
    # Dispostable
    "dispostable.com", "discard.email", "discardmail.com", "discardmail.de",
    # Mailnull
    "mailnull.com", "mailn.com",
    # Spamex
    "spamex.com", "spaml.com", "spaml.de",
    # Fakeinbox / Throwam
    "fakeinbox.com", "throwam.com",
    # Getairmail
    "getairmail.com", "getairmail.cf", "getairmail.ga", "getairmail.gq",
    "getairmail.ml", "getairmail.tk",
    # Mailnesia
    "mailnesia.com",
    # Maildrop
    "maildrop.cc",
    # Spamgourmet
    "spamgourmet.com", "spamgourmet.net", "spamgourmet.org",
    # Others
    "crap.handcrafted.jp", "jetable.com", "jetable.net", "jetable.org",
    "jetable.fr.nf", "nomail.xl.cx", "spamevader.com",
    "sogetthis.com", "spamspot.com", "tempemail.net",
    "temporaryemail.net", "temporaryemail.us", "temporaryforwarding.com",
    "thanksnospam.info", "throwam.com", "throwam.net",
    "trbvm.com", "trillianpro.com", "tyldd.com",
    "uggsrock.com", "urhen.com", "veryrealemail.com",
    "wetrainbayarea.com", "wetrainbayarea.org",
    "xagloo.com", "xemaps.com", "xents.com", "xmaily.com",
    "xoxy.net", "yapped.net", "yepmail.net",
    "yogamaven.com", "yomail.info", "yopmail.pp.ua",
    "ypmail.webarnak.fr.eu.org",
    "z1p.biz", "za.com", "zehnminutenmail.de",
    "zippymail.info", "zoaxe.com", "zoemail.net",
    "zoemail.org", "zomg.info",
    # CF/GA/ML/TK domains often used for throwaway
    "mailsac.com", "mailsac.org",
    "e4ward.com", "filzmail.com", "freemail.ms",
    "haltospam.com", "hatespam.org", "hidemail.de",
    "hidzz.com", "ieatspam.eu", "ieatspam.info",
    "ihateyoualot.info", "iheartspam.org",
    "imails.info", "inboxdesign.me",
    "includes.com", "ipoo.org", "irish2me.com",
    "jnxjn.com", "jourrapide.com",
    "kasmail.com", "kaspop.com",
    "klassmaster.com", "klassmaster.net",
    "klzlk.com", "koszmail.pl",
    "kurzepost.de", "letthemeatspam.com",
    "lol.ovpn.to", "lookugly.com",
    "lopl.co.cc", "lortemail.dk",
    "m4ilweb.info", "maboard.com",
    "mail-temporaire.fr", "mail.by",
    "mail2rss.org", "mailbidon.com",
    "mailbiz.biz", "mailblocks.com",
    "mailbucket.org", "mailc.net",
    "mailchop.com", "mailde.org",
    "maileimer.de", "mailexpire.com",
    "mailfall.com", "mailfree.ga",
    "mailfreeonline.com", "mailfs.com",
    "mailguard.me", "mailhazard.com",
    "mailhazard.us", "mailimate.com",
    "mailimails.com", "mailimate.com",
    "mailkurier.de", "mailme.ir",
    "mailme24.com", "mailmetrash.com",
    "mailmoat.com", "mailnadeln.net",
    "mailnew.com", "mailnull.com",
    "mailonaut.com", "mailorg.org",
    "mailpick.biz", "mailproxsy.com",
    "mailquack.com", "mailrock.biz",
    "mailscrap.com", "mailseal.de",
    "mailshell.com", "mailsiphon.com",
    "mailslapping.com", "mailslite.com",
    "mailsoul.com", "mailtome.de",
    "mailtothis.com", "mailvault.com",
    "mailw.info", "mailwire.com",
    "makemetheking.com", "manifestgenerator.com",
    "mt2009.com", "mt2014.com",
    "mt2015.com", "mycleaninbox.net",
    "mypartyclip.de", "myphantomemail.com",
    "mysamp.de", "myspace-france.fr",
    "myspaceinc.com", "myspaceinc.net",
    "myspaceinc.org", "myspacepimps.net",
    "myspamless.com", "mytrashmail.com",
    "neomailbox.com", "nepwk.com",
    "nervmich.net", "nervtmich.net",
    "netmails.com", "netmails.net",
    "nevermail.de", "newbpotato.tk",
    "nezdiro.org", "ninfected.com",
    "nnot.net", "no-spam.ws",
    "nobulk.com", "noclickemail.com",
    "nogmailspam.info", "nomail.pw",
    "nospam.ze.tc", "nospam4.us",
    "nospamfor.us", "nospamthanks.info",
    "notmailinator.com", "notypings.com",
    "novakovitch.net", "nowhere.org",
    "nowmymail.com",
}


def is_allowed_email(email: str) -> bool:
    """Returns False if the email domain is a known disposable provider."""
    try:
        domain = email.split("@")[1].lower().strip()
        return domain not in DISPOSABLE_DOMAINS
    except (IndexError, AttributeError):
        return False
