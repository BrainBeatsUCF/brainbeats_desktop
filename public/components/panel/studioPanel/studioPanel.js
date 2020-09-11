import React from 'react'
import { ListObjectType, VerticalListPanel } from '../verticalListPanel/verticalListPanel'
import { WorkstationPanel } from '../workstationPanel/workstationPanel'
import { GridSampleObject } from '../workstationPanel/gridComponents'
import { RequestUserBeatItems, RequestUserSampleItems } from '../../requestService/requestService'
import './studioPanel.css'

let StudioPanelComponentMounted = false
const WorkstationTitle = 'WorkStation'
const VerticalListTitles = {
  Beats: 'Beats',
  Samples: 'Samples',
}

class StudioPanel extends React.Component {
  /**
   * @param {{
   * customClass: String?
   * userInfo: VerifiedUserInfo,
   * setIsMakingNetworkActivity: (Boolean) => void
   * }} props
   */
  constructor(props) {
    super(props)
    this.state = {
      customClass: props.customClass ?? '',
      loadedBeats: [],
      loadedSamples: [GridSampleObject],
      loadedGridSampleObjects: [GridSampleObject],
    }

    // Hacky way of adding autocomplete to state through VSCode intellisense
    this.state.loadedSamples = []
    this.state.loadedGridSampleObjects = []
  }

  // MARK : Life Cycle

  componentDidMount() {
    StudioPanelComponentMounted = true
  }

  componentWillUnmount() {
    StudioPanelComponentMounted = false
  }

  // MARK : Event Handlers

  handleBeatsAddClick = () => {
    // TODO: Start a new slate on grid
    // If content already exists in grid, ask user to save then close
    // else close right away and renew slate
  }

  handleSampleAddClick = () => {
    // TODO: Open up EEG interface to start recording flow
    // Should be handled by appdelegate function with a callback on flow completion
    // This will help avoid memory leaks as a result of component lifecycles
  }

  handleBeatsItemClick = beatsObject => {
    // TODO: Load up beat into grid
  }

  /**
   * Load the selected sample onto the grid
   * @param {GridSampleObject} sampleObject
   */
  handleSampleItemClick = sampleObject => {
    const { loadedGridSampleObjects } = this.state
    loadedGridSampleObjects.push(sampleObject)
    this.setLoadedGridSampleObjects(
      loadedGridSampleObjects.map((value, index) => {
        let newValue = {}
        Object.assign(newValue, value)
        newValue.sampleRowIndex = index
        return newValue
      })
    )
  }

  // MARK : Network Request Handlers

  beatsItemListRequest = onCompletion => {
    RequestUserBeatItems(this.props.userInfo, data => {
      if (StudioPanelComponentMounted) {
        onCompletion(data)
        this.setState({ loadedBeats: data })
      }
    })
  }

  /**
   *
   * @param {(data: GridSampleObject) => void} onCompletion
   */
  sampleItemListRequest = onCompletion => {
    RequestUserSampleItems(this.props.userInfo, data => {
      if (StudioPanelComponentMounted) {
        onCompletion(data)
        this.setLoadedSamples(data)
      }
    })
  }

  // MARK : Helpers

  /**
   *
   * @param {[GridSampleObject]} loadedSamples
   */
  setLoadedSamples = loadedSamples => {
    this.setState({ loadedSamples: loadedSamples })
  }

  /**
   * @param {[GridSampleObject]} loadedGridSampleObjects
   */
  setLoadedGridSampleObjects = loadedGridSampleObjects => {
    this.setState({ loadedGridSampleObjects: loadedGridSampleObjects })
  }

  render() {
    return (
      <div className={`StudioPanel ${this.state.customClass}`}>
        <VerticalListPanel
          customClassname="LeftColumn"
          title={VerticalListTitles.Beats}
          onAddClick={this.handleBeatsAddClick}
          onItemClick={this.handleBeatsItemClick}
          setIsMakingNetworkActivity={this.props.setIsMakingNetworkActivity}
          itemListRequest={this.beatsItemListRequest}
        ></VerticalListPanel>
        <VerticalListPanel
          customClassname="MiddleColumn"
          title={VerticalListTitles.Samples}
          onAddClick={this.handleSampleAddClick}
          onItemClick={this.handleSampleItemClick}
          setIsMakingNetworkActivity={this.props.setIsMakingNetworkActivity}
          itemListRequest={this.sampleItemListRequest}
        ></VerticalListPanel>
        <WorkstationPanel
          customClassname="RightColumn"
          title={WorkstationTitle}
          loadedSampleList={this.state.loadedGridSampleObjects}
          setLoadedSampleList={this.setLoadedGridSampleObjects}
        ></WorkstationPanel>
      </div>
    )
  }
}

export { StudioPanel }
