import React from 'react'
import SynthesizerModels from './synthesizerModels.json'
import { startHardwareSocket, closeHardwareSocket } from './hardwareSocketHandler'
import { MODEL_CELL_LENGTH_IN_PIXELS, SynthesizingStage } from './synthesizerComponents'
import { MenuButton, MenuButtonColor } from '../../../input/input'
import { GridSampleObject } from '../../workstationPanel/gridObjects'
import { RequestGenerateSamples, GenerationInfo } from '../../../requestService/modelRequestService'
import { ResultStatus, VerifiedUserInfo } from '../../../requestService/authRequestService'
import { SynthSelectionStagePanel, SynthProcessingStagePanel, SynthCompletedStagePanel } from './synthesizerComponents'
import './synthesizerPanel.css'

const timeToCloseSocketOnMessage = 500 // 0.5 seconds

/// Cancel Token for monitering axios request
/// TODO: Store cancel token for axios call here and cancel if disrupt
const SampleSynthAudioContext = new AudioContext({ sampleRate: 44100 })

const StageTitle = {
  Selecting: 'Select Sample Synthesizer',
  Default: 'Sample Creator Processing',
}

const PredictedEmotions = {
  Happy: 'happy',
  Melancholy: 'melancholy',
  Surprised: 'surprised',
  Calm: 'calm',
}

const HideSynthesizerInfo = {
  customClassname: '',
  userInfo: VerifiedUserInfo,
  shouldShowSynthesizer: false,
  onSynthesizerClose: null,
}

const lengthForModelCount = count => {
  const lengthWithMargin = MODEL_CELL_LENGTH_IN_PIXELS + 40
  let length = lengthWithMargin
  const minimumMiddleCount = Math.ceil(Math.sqrt(count))
  while (length / lengthWithMargin < minimumMiddleCount) {
    length += lengthWithMargin
  }
  return length
}

class Synthesizer extends React.Component {
  /**
   * @param {{
   * userInfo: VerifiedUserInfo,
   * customClassname: String?,
   * shouldCloseSynthesizer: () => void
   * }} props
   */
  constructor(props) {
    super(props)
    this.state = {
      hasConnectedToEEG: false,
      hasBegunFetchingSamples: false,
      errorMessage: null,
      predictedEmotion: PredictedEmotions.Melancholy,
      predictedSamples: [GridSampleObject],
      synthesizingModel: SynthesizerModels[0],
      synthesizingStage: SynthesizingStage.Selecting,
      modelContainerLength: lengthForModelCount(SynthesizerModels.length),
    }
    // Adding autocomplete to javascript with intellisense
    this.state.predictedSamples = []
  }

  // MARK: Life Cycle

  componentDidUpdate() {
    const { synthesizingStage, hasConnectedToEEG, hasBegunFetchingSamples } = this.state
    if (synthesizingStage == SynthesizingStage.Connecting && !hasConnectedToEEG) {
      this.handleConnectingToHardware()
    } else if (synthesizingStage == SynthesizingStage.Modeling && !hasBegunFetchingSamples) {
      this.handleShouldRequestSamples()
    }
  }

  // MARK: EEG Event Handlers

  handleConnectingToHardware = _ => {
    this.setState({ hasConnectedToEEG: true })
    startHardwareSocket(
      message => {
        setTimeout(_ => {
          closeHardwareSocket()
          this.setState({
            predictedEmotion: message[window.process.env['BRAINBEATS_DATA_EMOTION']],
            synthesizingStage: SynthesizingStage.Modeling,
          })
        }, timeToCloseSocketOnMessage)
      },
      errorMessage => {
        console.error('EEG Error', errorMessage)
        this.handleAbortEEG()
      },
      // callback recieved when EEG successfully connects
      _ => {
        this.setState({
          synthesizingStage: SynthesizingStage.Recording,
        })
      }
    )
  }

  handleAbortEEG = _ => {
    closeHardwareSocket()
    this.setState({
      hasConnectedToEEG: false,
      synthesizingStage: SynthesizingStage.Selecting,
    })
  }

  // MARK: Stage Event Handlers

  /**
   * Cleans up any running processes like network requests or EEG connections before closing
   * synthesizer
   */
  handleShouldAbortSynthesizing = _ => {
    // cleanup background processes
    this.handleAbortEEG()
    this.props.shouldCloseSynthesizer()
  }

  handleShouldRequestSamples = _ => {
    const { userInfo } = this.props
    const { predictedEmotion, synthesizingModel } = this.state
    this.setState({ hasBegunFetchingSamples: true })
    RequestGenerateSamples(
      SampleSynthAudioContext,
      userInfo,
      {
        emotion: predictedEmotion,
        modelImageSource: synthesizingModel.modelImageName,
        modelName: synthesizingModel.modelName,
      },
      (samples, status) => {
        if (status === ResultStatus.Error) {
          this.setState({
            synthesizingStage: SynthesizingStage.Selecting,
            hasConnectedToEEG: false,
            hasBegunFetchingSamples: false,
            errorMessage: 'Something went wrong. Please try again',
          })
        } else {
          this.setState({
            synthesizingStage: SynthesizingStage.Completed,
            predictedSamples: samples,
          })
        }
      }
    )
  }

  /**
   * @param {[GridSampleObject]} selectedSamples
   */
  handleShouldSaveSamples = selectedSamples => {
    // make network request to create samples for selected items
    // close synthesizer on completion
    // POI: uploading samples recursively will take time and needs some visual
    // indicator of progress
    // setTimeout(() => {
    //   this.props.shouldCloseSynthesizer()
    // }, 300)
    console.log(selectedSamples)
    /**
     * id,
     * email, name, isPrivate,
     * attributes [],
     * audio, image
     */
  }

  // MARK: Render

  /**
   * @param {Number} modelContainerLength
   * @param {SynthesizingStage} synthesizingStage
   */
  handleStageRender = (modelContainerLength, synthesizingStage) => {
    // Selecting Stage
    if (synthesizingStage === SynthesizingStage.Selecting) {
      return (
        <SynthSelectionStagePanel
          customClassname="SynthesizerFullBodySection"
          modelCardsContainerWidth={modelContainerLength}
          availableSynthModels={SynthesizerModels}
          handleSynthModelClick={modelInfo => {
            this.setState({
              synthesizingModel: modelInfo,
              synthesizingStage: SynthesizingStage.Connecting,
            })
          }}
        ></SynthSelectionStagePanel>
      )
      // Completed Stage
    } else if (synthesizingStage === SynthesizingStage.Completed) {
      return (
        <SynthCompletedStagePanel
          leftSectionClassname="SynthesizerLeftBodySection"
          rightSectionClassname="SynthesizerRightBodySection"
          audioContext={SampleSynthAudioContext}
          synthesizingStage={synthesizingStage}
          sampleOptions={this.state.predictedSamples}
          saveSamples={selectedSamples => this.handleShouldSaveSamples(selectedSamples)}
          restartGenerator={_ =>
            this.setState({
              hasConnectedToEEG: false,
              hasBegunFetchingSamples: false,
              synthesizingStage: SynthesizingStage.Selecting,
            })
          }
        ></SynthCompletedStagePanel>
      )
      // Connecting | Recording | Modeling
    } else {
      return (
        <SynthProcessingStagePanel
          leftSectionClassname="SynthesizerLeftBodySection"
          rightSectionClassname="SynthesizerRightBodySection"
          synthesizingStage={synthesizingStage}
        ></SynthProcessingStagePanel>
      )
    }
  }

  render() {
    const { modelContainerLength, synthesizingStage } = this.state
    const customClassname = this.props.customClassname ?? ''
    const synthesizerHeaderOverlay = synthesizingStage === SynthesizingStage.Selecting ? '' : 'SynthesizerHeaderOverlay'
    const stageTitle = synthesizingStage === SynthesizingStage.Selecting ? StageTitle.Selecting : StageTitle.Default
    return (
      <>
        <div className={synthesizerHeaderOverlay}></div>
        <div className={`Synthesizer ${customClassname}`}>
          <div className="SynthesizerHeaderSection">
            <h4 className="SynthesizerHeaderTitle">{stageTitle}</h4>
            <MenuButton
              props={{
                customClass: '',
                title: 'Close',
                color: MenuButtonColor.Red,
                onMenuButtonClick: _ => this.handleShouldAbortSynthesizing(),
              }}
            ></MenuButton>
          </div>
          {this.handleStageRender(modelContainerLength, synthesizingStage)}
        </div>
      </>
    )
  }
}

/**
 * @param {HideSynthesizerInfo} props
 */
const SynthesizerWrapper = props => {
  const { customClassname, userInfo, shouldShowSynthesizer, onSynthesizerClose } = props
  if (!shouldShowSynthesizer) {
    return <></>
  } else {
    return (
      <Synthesizer
        userInfo={userInfo}
        customClassname={customClassname}
        shouldCloseSynthesizer={onSynthesizerClose}
      ></Synthesizer>
    )
  }
}

export { HideSynthesizerInfo, SynthesizerWrapper }
