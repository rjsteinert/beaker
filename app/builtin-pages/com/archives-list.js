import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import toggleable from './toggleable'
import { niceDate } from '../../lib/time'
import { ucfirst, pluralize, shortenHash } from '../../lib/strings'
import { pushUrl, writeToClipboard } from '../../lib/fg/event-handlers'

// exported api
// =

export function render (archivesList, opts = {}) {
  const rerender = opts.render || (() => {})

  // render archives
  var numDeleted = 0
  var archiveEls = []
  archivesList.archives.forEach((archive, index) => {
    // if not saved but in this listing, then it was recently deleted
    if (!archive.userSettings.isSaved) {
      return numDeleted++
    }
    let title = archive.title || shortenHash(archive.key)
    let npeers = archive.peers || 0
    let hostBtnTitle = 'Host'
    if (isHosting(archive))
      hostBtnTitle += 'ing'

    // render owned archive
    let mtime = archive.mtime ? ucfirst(niceDate(archive.mtime)) : '--'
    archiveEls.push(yo`<div class="al-row">
      <div class="al-main">
        <div class="al-title">
          <img class="favicon" src=${'beaker-favicon:dat://'+archive.key} />
          <a href=${'beaker:archive/'+archive.key} onclick=${pushUrl} title=${title}>${title}</a>
          <small>Updated ${mtime}</small>
        </div>
        <div class="al-ctrls">
          ${isHosting(archive) 
            ? yo`<a class="btn pressed" onclick=${onToggleServeArchive(archive, rerender)} title=${hostBtnTitle}><span class="icon icon-check"></span> ${hostBtnTitle}</a>` 
            : yo`<a class="btn" onclick=${onToggleServeArchive(archive, rerender)} title=${hostBtnTitle}><span class="icon icon-upload-cloud"></span> ${hostBtnTitle}</a>` }
          <div class="al-dropdown">${toggleable(yo`
            <div class="dropdown-btn-container">
              <a class="toggleable btn"><span class="icon icon-down-open-mini"></span></a>
              <div class="dropdown-btn-list">
                <div onclick=${onCopyLink(archive.key)}><span class="icon icon-link"></span> Copy Link</div>
                <div onclick=${onDeleteArchive(archive, rerender)}><span class="icon icon-trash"></span> Delete</div>
              </div>
            </div>
          `)}</div>
        </div>
      </div>
      ${ getForkOf(archive)
        ? yo`<div class="al-fork-of">
            <span class="icon icon-flow-branch"></span> Fork of <a href=${getForkOf(archive)}>${shortenHash(getForkOf(archive))}</a>
          </div>`
        : '' }
      ${ archive.createdBy
        ? yo`<div class="al-created-by">
            <span class="icon icon-code"></span> Created by <a href=${archive.createdBy.url}>${archive.createdBy.title || shortenHash(archive.createdBy.url)}</a>
          </div>`
        : '' }
      ${ archive.description
        ? yo`<div class="al-desc">${archive.description}</div>`
        : '' }
    </div>`)
  })

  // if empty
  if (opts.renderEmpty && archiveEls.length == 0)
    archiveEls.push(opts.renderEmpty())

  // give option to undo deletes
  if (numDeleted) {
    archiveEls.unshift(yo`<div class="notice">${numDeleted} ${pluralize(numDeleted, 'archive')} deleted. <a onclick=${onUndoDeletions(archivesList, rerender)}>undo</a></div>`)
  }

  // render all
  return yo`<div class="archives-list">
    ${archiveEls}
  </div>`
}

function onCopyLink (key) {
  return e => writeToClipboard('dat://'+key)
}

function onToggleServeArchive (archiveInfo, render) {
  return e => {
    e.preventDefault()
    e.stopPropagation()
    datInternalAPI.setArchiveUserSettings(archiveInfo.key, {
      isSaved: true,
      isHosting: !isHosting(archiveInfo)
    }).then(settings => {
      archiveInfo.userSettings.isSaved = settings.isSaved
      archiveInfo.userSettings.isHosting = settings.isHosting
      render()
    })
  }
}

function onDeleteArchive (archiveInfo, render) {
  return e => {
    e.preventDefault()
    e.stopPropagation()

    datInternalAPI.setArchiveUserSettings(archiveInfo.key, {
      isSaved: false,
      isHosting: false
    })
    archiveInfo.userSettings.isSaved = false
    archiveInfo.userSettings.isHosting = false
    render()
  }
}

function onUndoDeletions (archivesList, render) {
  return (e) => {
    e.preventDefault()
    e.stopPropagation()

    archivesList.archives.forEach(archiveInfo => {
      if (!archiveInfo.userSettings.isSaved) {
        archiveInfo.userSettings.isSaved = true
        datInternalAPI.setArchiveUserSettings(archiveInfo.key, { isSaved: true })
      }
    })
    render()
  }
}

function isHosting (archive) {
  return archive.userSettings.isHosting
}

function getForkOf (archive) {
  return archive.forkOf && archive.forkOf[0]
}
